import React, { useState, useEffect, useCallback } from 'react';
import { useApp, useEnVivo, useCadaTanto } from '../context/AppContext';
import { Icono, Marca, Vacio } from '../components/Piezas';
import { fechaLarga, agrupar, minutosDesde, zonaMesa } from '../utils/formato';

const COLUMNAS = [
  { estado: 'pendiente', titulo: 'Nuevos', color: 'var(--r400)', accion: 'Empezar a preparar', sig: 'en_preparacion', btn: 'btn-primario' },
  { estado: 'en_preparacion', titulo: 'Preparando', color: 'var(--d400)', accion: 'Marcar listo', sig: 'listo', btn: 'btn-dorado' },
  { estado: 'listo', titulo: 'Listos para llevar', color: '#4ADE80', accion: 'Entregado a la mesa', sig: 'entregado', btn: 'btn-suave' },
];

const tonoTiempo = (min) => (min >= 15 ? 'i-rojo' : min >= 8 ? 'i-dorado' : 'i-verde');

export default function CocinaApp() {
  const { logout, fetchPedidosActivos, fetchTiempos, actualizarEstadoPedido, entregarPedido, mostrarToast } = useApp();
  const [pedidos, setPedidos] = useState([]);
  const [tiempos, setTiempos] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const [, setTic] = useState(0);
  const [hora, setHora] = useState(new Date());

  const cargar = useCallback(async () => {
    try { setPedidos(await fetchPedidosActivos()); } catch {}
    fetchTiempos().then(setTiempos).catch(() => {});
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useCadaTanto(cargar, 30000);
  // Los minutos de cada comanda y el reloj se actualizan solos.
  useCadaTanto(() => { setTic((t) => t + 1); setHora(new Date()); }, 30000);

  const enVivo = useEnVivo((msg) => {
    if (['pedido_nuevo', 'pedido_actualizado', 'pedido_entregado', 'mesa_pagada'].includes(msg.tipo)) cargar();
    if (msg.tipo === 'pedido_nuevo') {
      mostrarToast(`Nuevo pedido · Mesa ${msg.pedido?.mesa_numero}`);
      sonar();
    }
  });

  const avanzar = async (p, sig) => {
    setOcupado(p.id);
    try {
      if (sig === 'entregado') await entregarPedido(p.id);
      else await actualizarEstadoPedido(p.id, sig);
      await cargar();
    } catch (e) { mostrarToast(e.response?.data?.error || 'No se pudo actualizar'); }
    finally { setOcupado(null); }
  };

  const activos = pedidos.filter((p) => COLUMNAS.some((c) => c.estado === p.estado));

  return (
    <div className="cocina">
      <header className="barra-sup oscura">
        <div className="fila" style={{ gap: 14 }}>
          <Marca />
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--v800)', paddingLeft: 14 }}>
            <span className="num" style={{ fontSize: 20 }}>Cocina</span>
            <span style={{ fontSize: 13, color: 'var(--v200)' }}>{fechaLarga(hora)} · {hora.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        </div>
        <div className="fila" style={{ flexWrap: 'wrap', gap: 10 }}>
          <span className="pildora"><span className={`vivo${enVivo ? '' : ' off'}`} />{enVivo ? 'En vivo' : 'Reconectando…'}</span>
          {tiempos?.promedio_min != null && <span className="pildora" style={{ color: '#fff' }}>Promedio de salida <strong>{tiempos.promedio_min} min</strong></span>}
          <button type="button" className="btn btn-borde oscuro" onClick={logout}>Salir</button>
        </div>
      </header>

      <main className="tablero">
        {COLUMNAS.map((c) => {
          const lista = activos.filter((p) => p.estado === c.estado);
          return (
            <section key={c.estado} className="columna" aria-label={c.titulo}>
              <div className="columna-cab"><span><i style={{ background: c.color }} />{c.titulo}</span><b>{lista.length}</b></div>
              {lista.length === 0 && <Vacio oscuro titulo="Nada aquí" texto={c.estado === 'pendiente' ? 'Los pedidos nuevos aparecen solos.' : null} />}
              {lista.map((p) => {
                const min = minutosDesde(p.created_at);
                return (
                  <article key={p.id} className="comanda" style={{ '--borde': c.color }}>
                    <div className="comanda-cab">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <h3>Mesa {p.mesa_numero}</h3>
                        <span className="muted" style={{ fontSize: 12 }}>{zonaMesa(p.mesa_numero)} · {p.mesero_nombre}</span>
                      </div>
                      <span className={`insignia ${tonoTiempo(min)}`} style={{ fontSize: 13 }}><Icono n="reloj" size={14} grosor={2.2} />{min} min</span>
                    </div>
                    <div className="comanda-items">
                      {agrupar(p.items).map((g) => (
                        <div key={g.clave} className="comanda-item">
                          <span className="cant">{g.cant}</span>
                          <div>
                            <b>{g.proteina || g.nombre}</b>
                            {g.proteina && <small>{g.plato}</small>}
                            {g.adicional && <small>Adicional</small>}
                            {g.nota && <span className="nota">{g.nota}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="comanda-pie">
                      <button type="button" className={`btn ${c.btn} btn-bloque`} disabled={ocupado === p.id} onClick={() => avanzar(p, c.sig)}>
                        {ocupado === p.id ? 'Guardando…' : c.accion}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </main>
    </div>
  );
}

// Un "ding" corto cuando entra un pedido (sin archivos de audio).
function sonar() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.start(t); o.stop(t + 0.32);
    });
  } catch {}
}
