import React, { useState, useEffect, useCallback } from 'react';
import { useApp, useEnVivo, useCadaTanto } from '../context/AppContext';
import { Marca, Vacio, DialogoQuitar } from '../components/Piezas';
import { fechaLarga, agrupar, pesos, totalPedido, minutosDesde, contarPlatos, zonaMesa, PLATOS, NOMBRES_FDS } from '../utils/formato';

const POR_COBRAR = ['listo', 'entregado'];
const ESTADO_CORTO = { pendiente: 'en cola', en_preparacion: 'preparando' };
const NOMBRE_CORTO = { 'Almuerzo del día': 'Almuerzos', 'Bandeja con sopa': 'Bandejas con sopa', 'Bandeja sin sopa': 'Bandejas sin sopa' };

export default function CajaApp() {
  const { user, logout, fetchPedidosActivos, fetchResumenCaja, pagarPedido, anularItem, mostrarToast } = useApp();
  const [quitar, setQuitar] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [selId, setSelId] = useState(null);
  const [recibido, setRecibido] = useState('');
  const [cobrando, setCobrando] = useState(false);

  const cargar = useCallback(async () => {
    try { setPedidos(await fetchPedidosActivos()); } catch {}
    fetchResumenCaja().then(setResumen).catch(() => {});
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useCadaTanto(cargar, 15000);
  useEnVivo(() => cargar());

  const porCobrar = pedidos.filter((p) => POR_COBRAR.includes(p.estado));
  const enServicio = pedidos.filter((p) => !POR_COBRAR.includes(p.estado) && p.estado !== 'pagado');
  const sel = porCobrar.find((p) => p.id === selId) || porCobrar[0] || null;
  const total = sel ? totalPedido(sel) : 0;
  const rec = Number(String(recibido).replace(/\D/g, '')) || 0;
  const cambio = rec - total;

  useEffect(() => { setRecibido(''); }, [sel?.id]);

  const cobrar = async () => {
    if (!sel) return;
    setCobrando(true);
    try {
      await pagarPedido(sel.id);
      mostrarToast(`Mesa ${sel.mesa_numero} cobrada ✓${rec > total ? ` · cambio ${pesos(cambio)}` : ''}`);
      setSelId(null); setRecibido('');
      cargar();
    } catch { mostrarToast('No se pudo cobrar. Intenta de nuevo.'); }
    finally { setCobrando(false); }
  };

  const tiposPlato = [...PLATOS, ...NOMBRES_FDS].filter((p) => PLATOS.includes(p) || resumen?.platos?.[p]);

  return (
    <div className="caja">
      <header className="barra-sup clara">
        <div className="fila"><Marca claro={false} verde /><span className="muted" style={{ fontWeight: 600 }}>· Caja</span></div>
        <div className="fila">
          <span className="texto-suave" style={{ fontSize: 14 }}>Turno de <b style={{ color: 'var(--v900)' }}>{user?.nombre}</b></span>
          <button type="button" className="btn btn-borde" onClick={logout}>Salir</button>
        </div>
      </header>

      <section className="franja-oscura">
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="antetitulo claro">{fechaLarga()}</span>
            <h1 className="titulo-pag" style={{ fontSize: 34 }}>Cobros del día</h1>
          </div>
          <div className="mini-kpis">
            <div className="mini-kpi"><span>Mesas cobradas</span><b>{resumen?.mesasCobradas ?? '–'}</b></div>
            {tiposPlato.map((p) => (
              <div key={p} className="mini-kpi"><span>{NOMBRE_CORTO[p] || p}</span><b>{resumen?.platos?.[p] ?? 0}</b></div>
            ))}
            <div className="mini-kpi dorado"><span>Por cobrar</span><b>{porCobrar.length} {porCobrar.length === 1 ? 'mesa' : 'mesas'}</b></div>
          </div>
        </div>
      </section>

      <main className="caja-cuerpo">
        <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="antetitulo">Listas para cobrar</span>
          {porCobrar.length === 0 && <Vacio titulo="No hay mesas por cobrar" texto="Cuando cocina termine un pedido, la mesa aparece aquí." />}
          {porCobrar.map((p) => (
            <button key={p.id} type="button" className="mesa-cobro" aria-pressed={sel?.id === p.id} onClick={() => setSelId(p.id)}>
              <span className="n">{p.mesa_numero}</span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <b style={{ fontSize: 15 }}>Mesa {p.mesa_numero} · {zonaMesa(p.mesa_numero)}</b>
                <span className="muted" style={{ fontSize: 13 }}>{p.mesero_nombre} · {contarPlatos(p.items)} {contarPlatos(p.items) === 1 ? 'plato' : 'platos'} · hace {minutosDesde(p.created_at)} min</span>
              </span>
              <span className="num" style={{ fontSize: 18 }}>{pesos(totalPedido(p))}</span>
            </button>
          ))}
          {enServicio.length > 0 && (
            <>
              <span className="antetitulo" style={{ color: 'var(--v400)', marginTop: 12 }}>Todavía en servicio</span>
              <div className="chips">
                {enServicio.map((p) => (
                  <span key={p.id} className="tarjeta" style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, borderRadius: 12 }}>
                    Mesa {p.mesa_numero} <span className="muted" style={{ fontWeight: 500 }}>{ESTADO_CORTO[p.estado] || p.estado}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {sel && (
          <aside className="tarjeta cuenta" aria-label="Cuenta">
            <div className="tarjeta-cab" style={{ borderBottom: '1px solid var(--v50)', padding: '22px 24px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="antetitulo">Cuenta</span>
                <span className="num" style={{ fontSize: 26 }}>Mesa {sel.mesa_numero} · {zonaMesa(sel.mesa_numero)}</span>
              </div>
              <span className="insignia i-verde" style={{ fontSize: 13 }}>{sel.comensales} {sel.comensales === 1 ? 'persona' : 'personas'}</span>
            </div>
            <div style={{ padding: '8px 24px' }}>
              {agrupar(sel.items).map((g) => (
                <div key={g.clave} className="linea">
                  <span className="num" style={{ minWidth: 28, color: 'var(--v500)' }}>{g.cant}×</span>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <b style={{ fontSize: 15 }}>{g.proteina ? g.plato : g.nombre}</b>
                    {g.proteina && <span className="muted" style={{ fontSize: 12 }}>{g.proteina}</span>}
                    {g.adicional && <span className="muted" style={{ fontSize: 12 }}>Adicional</span>}
                  </span>
                  <span style={{ fontWeight: 600 }}>{pesos(g.valor)}</span>
                  <button type="button" className="redondo" aria-label={`Quitar ${g.nombre}`}
                    onClick={() => setQuitar({ pedido: sel, idx: g.indices[g.indices.length - 1], nombre: g.nombre })}>×</button>
                </div>
              ))}
            </div>
            <div className="total-banda">
              <span className="num" style={{ fontSize: 16, fontWeight: 700 }}>Total a cobrar</span>
              <span className="num" style={{ fontSize: 32, color: 'var(--v800)' }}>{pesos(total)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <div className="campo">
                  <label htmlFor="recibido">Recibido</label>
                  <input id="recibido" className="input" inputMode="numeric" placeholder="$0" style={{ fontWeight: 600 }}
                    value={rec ? pesos(rec) : ''} onChange={(e) => setRecibido(e.target.value)} />
                </div>
                <div className="campo">
                  <span className="etiqueta">Cambio</span>
                  {rec > 0 && cambio < 0
                    ? <span className="cambio falta">Faltan {pesos(-cambio)}</span>
                    : <span className="cambio">{rec ? pesos(cambio) : '—'}</span>}
                </div>
              </div>
              <div className="billetes" aria-label="Valores rápidos">
                <button type="button" onClick={() => setRecibido(String(total))}>Exacto</button>
                {[20000, 50000, 100000].filter((b) => b >= total).map((b) => (
                  <button key={b} type="button" onClick={() => setRecibido(String(b))}>{pesos(b)}</button>
                ))}
              </div>
              <button type="button" className="btn btn-dorado" style={{ height: 56, fontSize: 17 }} onClick={cobrar} disabled={cobrando || (rec > 0 && cambio < 0)}>
                {cobrando ? 'Cobrando…' : 'Cobrar y liberar mesa'}
              </button>
            </div>
          </aside>
        )}
      </main>

      {quitar && (
        <DialogoQuitar nombre={quitar.nombre} mesa={quitar.pedido.mesa_numero} motivoInicial="Devuelto por el cliente" onCerrar={() => setQuitar(null)}
          onConfirmar={async (motivo) => {
            try { await anularItem(quitar.pedido.id, quitar.idx, motivo); mostrarToast('Plato quitado ✓'); setQuitar(null); cargar(); }
            catch (e) { mostrarToast(e.response?.data?.error || 'No se pudo quitar'); }
          }} />
      )}
    </div>
  );
}
