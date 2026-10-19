import React, { useState, useEffect, useCallback } from 'react';
import { useApp, useEnVivo, useCadaTanto } from '../context/AppContext';
import MapaMesas from '../components/MapaMesas';
import { Icono, Vacio, DialogoQuitar } from '../components/Piezas';
import {
  PROTEINAS, ALMUERZO, BANDEJAS, PLATOS_FDS, ADICIONALES, claveMenu, nuevoItem, nombreItem,
  pesos, fechaLarga, esFinDeSemana, zonaMesa, agrupar, minutosDesde, vigentes, totalPedido, contarPlatos,
} from '../utils/formato';

const ESTADO = {
  pendiente: { texto: 'En cola', clase: 'i-rojo', punto: 'var(--r400)' },
  en_preparacion: { texto: 'Preparando', clase: 'i-dorado', punto: 'var(--d500)' },
  listo: { texto: 'Listo para llevar', clase: 'i-verde', punto: '#22A55B' },
  entregado: { texto: 'En la mesa', clase: 'i-azul', punto: '#598EBA' },
};
const ABIERTO = ['pendiente', 'en_preparacion']; // a estos se les pueden sumar platos

export default function MeseroApp() {
  const { user, logout, menu, fetchMesas, fetchMenu, fetchPedidosActivos, mostrarToast } = useApp();
  const [mesas, setMesas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [tab, setTab] = useState('mesas');
  const [mesaActiva, setMesaActiva] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([fetchMesas(), fetchPedidosActivos()]);
      setMesas(m); setPedidos(p);
    } catch {}
  }, []);

  useEffect(() => { cargar(); fetchMenu().catch(() => {}); }, []);
  // El menú (agotados) y las mesas se refrescan solos.
  useCadaTanto(() => { cargar(); fetchMenu().catch(() => {}); }, 20000);

  useEnVivo((msg) => {
    if (msg.tipo === 'pedido_actualizado' && msg.pedido?.estado === 'listo' && msg.pedido.mesero_nombre === user?.nombre) {
      setAviso({ mesa: msg.pedido.mesa_numero, platos: contarPlatos(msg.pedido.items) });
      mostrarToast(`Mesa ${msg.pedido.mesa_numero} lista para llevar`);
      try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch {}
    }
    cargar();
  });

  const pedidosDe = (n) => pedidos.filter((p) => Number(p.mesa_numero) === n);
  const estadoDe = (n) => {
    const ps = pedidosDe(n);
    if (ps.some((p) => p.estado === 'listo')) return 'lista';
    const m = mesas.find((x) => Number(x.numero) === n);
    return ps.length || m?.estado === 'ocupada' ? 'ocupada' : 'libre';
  };
  const ocupadas = mesas.filter((m) => estadoDe(Number(m.numero)) === 'ocupada').length;
  const listas = mesas.filter((m) => estadoDe(Number(m.numero)) === 'lista').length;
  const mios = pedidos.filter((p) => p.mesero_nombre === user?.nombre);

  if (mesaActiva) {
    return <Pedido mesa={mesaActiva} menu={menu} onVolver={() => { setMesaActiva(null); cargar(); }} />;
  }

  return (
    <div className="movil">
      <header className="movil-cab">
        <div className="fila entre">
          <div className="fila">
            <span className="marca-placa verde" style={{ width: 36, height: 36, borderRadius: 11 }}><Icono n="llama" color="var(--d400)" grosor={2} /></span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="muted" style={{ fontSize: 12 }}>{fechaLarga()}</span>
              <span className="num" style={{ fontSize: 18 }}>Hola, {user?.nombre?.split(' ')[0]}</span>
            </div>
          </div>
          <button type="button" className="btn btn-borde btn-icono" onClick={logout} aria-label="Cerrar sesión"><Icono n="salir" color="var(--v600)" /></button>
        </div>
        <div className="contadores">
          <div className="contador"><b>{ocupadas}</b><span>Ocupadas</span></div>
          <div className="contador dorado"><b>{listas}</b><span>Para servir</span></div>
          <div className="contador blanco"><b>{Math.max(0, mesas.length - ocupadas - listas)}</b><span>Libres</span></div>
        </div>
      </header>

      <main className="movil-cuerpo">
        {aviso && (
          <button type="button" className="aviso" style={{ border: 0, textAlign: 'left', width: '100%' }}
            onClick={() => { const m = mesas.find((x) => Number(x.numero) === aviso.mesa); setAviso(null); if (m) setMesaActiva(m); }}>
            <Icono n="campana" size={22} color="var(--d800)" />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <b style={{ fontSize: 14 }}>Mesa {aviso.mesa} lista para servir</b>
              <span style={{ fontSize: 12, color: 'var(--d800)' }}>Cocina terminó {aviso.platos} plato{aviso.platos !== 1 ? 's' : ''} · toca para abrir</span>
            </span>
          </button>
        )}

        {tab === 'mesas' && <MapaMesas mesas={mesas} estadoDe={estadoDe} onMesaClick={setMesaActiva} />}

        {tab === 'pedidos' && (
          <>
            <span className="antetitulo">Mis pedidos abiertos</span>
            {mios.length === 0 && <Vacio titulo="No tienes pedidos abiertos" texto="Toca una mesa en el mapa para tomar un pedido." />}
            {mios.map((p) => {
              const e = ESTADO[p.estado] || ESTADO.pendiente;
              return (
                <button key={p.id} type="button" className="tarjeta" onClick={() => { const m = mesas.find((x) => x.id === p.mesa_id); if (m) setMesaActiva(m); }}
                  style={{ padding: '14px 16px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="fila entre" style={{ width: '100%' }}>
                    <span className="num" style={{ fontSize: 18 }}>Mesa {p.mesa_numero}</span>
                    <span className={`insignia ${e.clase}`}><span className="punto" style={{ background: e.punto }} />{e.texto}</span>
                  </span>
                  <span className="muted" style={{ fontSize: 13 }}>{contarPlatos(p.items)} platos · {pesos(totalPedido(p))} · hace {minutosDesde(p.created_at)} min</span>
                </button>
              );
            })}
          </>
        )}

        {tab === 'menu' && <MenuHoy menu={menu} />}
      </main>

      <nav className="nav-inferior" aria-label="Secciones">
        <div>
          <button type="button" aria-current={tab === 'mesas' ? 'page' : undefined} onClick={() => setTab('mesas')}><Icono n="mesas" size={22} />Mesas</button>
          <button type="button" aria-current={tab === 'pedidos' ? 'page' : undefined} onClick={() => setTab('pedidos')}>
            <Icono n="lista" size={22} />Mis pedidos{mios.length > 0 && <span className="burbuja">{mios.length}</span>}
          </button>
          <button type="button" aria-current={tab === 'menu' ? 'page' : undefined} onClick={() => setTab('menu')}><Icono n="menu" size={22} />Menú hoy</button>
        </div>
      </nav>
    </div>
  );
}

function MenuHoy({ menu }) {
  const fds = esFinDeSemana();
  const fila = (n, ok, precio) => (
    <div key={n} className="linea" style={{ padding: '12px 0' }}>
      <span style={{ flex: 1, fontWeight: 600, color: ok ? 'var(--v900)' : 'var(--v400)' }}>{n}</span>
      {precio && <span className="muted" style={{ fontSize: 13 }}>{pesos(precio)}</span>}
      <span className={`insignia ${ok ? 'i-verde' : 'i-rojo'}`}>{ok ? 'Hay' : 'Agotado'}</span>
    </div>
  );
  const disp = (p) => menu?.platos?.[claveMenu(p)] !== false;
  return (
    <>
      <section className="tarjeta" style={{ padding: '8px 16px' }}>
        <span className="antetitulo" style={{ display: 'block', padding: '10px 0 4px' }}>Platos</span>
        {fila(ALMUERZO.plato, disp(ALMUERZO.plato), ALMUERZO.precio)}
        {BANDEJAS.map((b) => fila(b.plato, disp(b.plato), b.precio))}
        {fds && PLATOS_FDS.map((p) => fila(p.plato, disp(p.plato), p.precio))}
      </section>
      <section className="tarjeta" style={{ padding: '8px 16px' }}>
        <span className="antetitulo" style={{ display: 'block', padding: '10px 0 4px' }}>Proteínas para bandeja</span>
        {PROTEINAS.map((p) => fila(p, menu?.proteinas?.[p] !== false))}
      </section>
    </>
  );
}

function Pedido({ mesa, menu, onVolver }) {
  const { fetchPedidosMesa, crearPedido, agregarItems, entregarPedido, pagarPedido, anularItem, mostrarToast } = useApp();
  const n = Number(mesa.numero);
  const zona = zonaMesa(n);
  const [activos, setActivos] = useState([]);
  const [comensales, setComensales] = useState(2);
  const disp = (plato) => menu?.platos?.[claveMenu(plato)] !== false;
  const bandejas = BANDEJAS.filter((b) => disp(b.plato));
  const [bandeja, setBandeja] = useState(bandejas[0] || BANDEJAS[0]);
  const [items, setItems] = useState([]); // por enviar
  const [verPedido, setVerPedido] = useState(true);
  const [quitar, setQuitar] = useState(null); // { pedido, idx, nombre }
  const [enviando, setEnviando] = useState(false);
  const [verAdicionales, setVerAdicionales] = useState(false);
  const otros = [ALMUERZO, ...(esFinDeSemana() ? PLATOS_FDS : [])].filter((p) => disp(p.plato));

  const cargar = useCallback(async () => {
    try { setActivos(await fetchPedidosMesa(mesa.id)); } catch {}
  }, [mesa.id]);
  useEffect(() => { cargar(); }, [cargar]);
  useEnVivo((msg) => { if (Number(msg.pedido?.mesa_numero) === n) cargar(); });

  const agregar = (it) => setItems((prev) => [...prev, nuevoItem(it)]);
  const agregarBandeja = (proteina) => agregar({ desc: `${bandeja.codigo} ${proteina}`, plato: bandeja.plato, proteina, precio: bandeja.precio });
  const ponerNota = (key, nota) => setItems((prev) => prev.map((x) => (x.key === key ? { ...x, nota } : x)));
  const enCarrito = (p) => items.filter((x) => x.proteina === p && x.plato === bandeja.plato).length;

  const totalCocina = activos.reduce((s, p) => s + totalPedido(p), 0);
  const platosCocina = activos.reduce((s, p) => s + vigentes(p.items).length, 0);
  const totalNuevo = items.reduce((s, i) => s + i.precio, 0);

  const enviar = async () => {
    if (!items.length) return;
    const limpios = items.map(({ nota, ...it }) => (nota && nota.trim() ? { ...it, nota: nota.trim().slice(0, 140) } : it));
    setEnviando(true);
    try {
      const abierto = activos.find((p) => ABIERTO.includes(p.estado));
      if (abierto) { await agregarItems(abierto.id, limpios); mostrarToast('Platos agregados al pedido ✓'); }
      else { await crearPedido({ mesa_id: mesa.id, mesa_numero: n, zona, items: limpios, comensales }); mostrarToast('Pedido enviado a cocina ✓'); }
      setItems([]);
      cargar();
    } catch (e) { mostrarToast(e.response?.data?.error || 'No se pudo enviar. Revisa la conexión.'); }
    finally { setEnviando(false); }
  };

  const accion = async (fn, msg, volver = false) => {
    try { await fn(); mostrarToast(msg); if (volver) onVolver(); else cargar(); }
    catch (e) { mostrarToast(e.response?.data?.error || 'No se pudo completar'); }
  };

  const listos = activos.filter((p) => p.estado === 'listo');
  const porCobrar = activos.filter((p) => ['listo', 'entregado'].includes(p.estado));
  const todoServido = activos.length > 0 && activos.every((p) => ['listo', 'entregado'].includes(p.estado));

  return (
    <div className="movil" style={{ paddingBottom: 110 }}>
      <header className="cab-oscura">
        <button type="button" className="btn btn-icono" onClick={onVolver} aria-label="Volver a las mesas"><Icono n="atras" /></button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span className="antetitulo claro" style={{ fontSize: 11 }}>{zona}</span>
          <span className="num" style={{ fontSize: 22 }}>Mesa {n}</span>
        </div>
        {!activos.length && (
          <div className="paso" role="group" aria-label="Comensales">
            <button type="button" aria-label="Quitar comensal" onClick={() => setComensales((c) => Math.max(1, c - 1))}>−</button>
            <div><b>{comensales}</b><span>pers.</span></div>
            <button type="button" aria-label="Agregar comensal" onClick={() => setComensales((c) => Math.min(20, c + 1))}>+</button>
          </div>
        )}
      </header>

      {/* Cuenta de la mesa, siempre arriba */}
      <section className="cuenta-mesa" aria-label="Cuenta de la mesa">
        <div className="cuenta-mesa-total">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 12, color: 'var(--v200)' }}>Total de la cuenta</span>
            <span style={{ fontSize: 12, color: 'var(--v300)' }}>{platosCocina ? `${platosCocina} ya pedidos` : 'Nada pedido aún'}{items.length ? ` · ${items.length} por enviar` : ''}</span>
          </div>
          <span className="num" style={{ fontSize: 26, color: '#fff' }}>{pesos(totalCocina + totalNuevo)}</span>
        </div>
      </section>

      <main className="movil-cuerpo">
        {activos.length > 0 && (
          <section className="tarjeta" style={{ padding: '6px 16px 10px' }}>
            <button type="button" className="fila entre" onClick={() => setVerPedido((v) => !v)} aria-expanded={verPedido}
              style={{ width: '100%', border: 0, background: 'transparent', padding: '10px 0', textAlign: 'left' }}>
              <span className="num" style={{ fontSize: 15 }}>Ya pedido · {pesos(totalCocina)}</span>
              <span className="muted" style={{ fontSize: 13 }}>{verPedido ? 'Ocultar' : 'Ver'}</span>
            </button>
            {verPedido && activos.map((p) => {
              const e = ESTADO[p.estado] || ESTADO.pendiente;
              return (
                <div key={p.id} style={{ borderTop: '1px solid var(--v50)', paddingTop: 8, marginTop: 2 }}>
                  <span className={`insignia ${e.clase}`}><span className="punto" style={{ background: e.punto }} />{e.texto} · {minutosDesde(p.created_at)} min</span>
                  {agrupar(p.items).map((g) => (
                    <div key={g.clave} className="linea" style={{ padding: '8px 0' }}>
                      <span style={{ flex: 1, fontSize: 14 }}>
                        {g.cant > 1 && <b>{g.cant}× </b>}{g.nombre}
                        {g.nota && <><br /><span className="nota">{g.nota}</span></>}
                      </span>
                      <span className="muted" style={{ fontSize: 13 }}>{pesos(g.valor)}</span>
                      <button type="button" className="redondo" aria-label={`Quitar ${g.nombre}`}
                        onClick={() => setQuitar({ pedido: p, idx: g.indices[g.indices.length - 1], nombre: g.nombre })}>×</button>
                    </div>
                  ))}
                </div>
              );
            })}
          </section>
        )}

        <span className="antetitulo" style={{ marginTop: 2 }}>Bandeja</span>
        {bandejas.length > 1 && (
          <div className="segmento" role="radiogroup" aria-label="Tipo de bandeja">
            {bandejas.map((b) => (
              <button key={b.plato} type="button" role="radio" aria-checked={bandeja.plato === b.plato} onClick={() => setBandeja(b)}>
                {b.corto} · {pesos(b.precio)}
              </button>
            ))}
          </div>
        )}
        {bandejas.length > 0 ? (
          <div className="proteinas">
            {PROTEINAS.map((p) => {
              const hay = menu?.proteinas?.[p] !== false;
              const c = enCarrito(p);
              return (
                <button key={p} type="button" className={`proteina${c ? ' sel' : ''}`} disabled={!hay} aria-label={`Agregar ${bandeja.plato} con ${p}`} onClick={() => agregarBandeja(p)}>
                  <b>{p}</b><span>{!hay ? 'Agotada' : c ? `${c} por enviar` : 'Tocar para sumar'}</span>
                </button>
              );
            })}
          </div>
        ) : <p className="muted" style={{ fontSize: 13 }}>Hoy no hay bandejas.</p>}

        {otros.length > 0 && (
          <>
            <span className="antetitulo" style={{ marginTop: 4 }}>Otros platos</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {otros.map((pl) => (
                <button key={pl.plato} type="button" className="proteina" onClick={() => agregar(pl)}>
                  <b>{pl.plato}</b><span>{pesos(pl.precio)}{pl === ALMUERZO ? ' · sin proteína' : ''}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <span className="antetitulo" style={{ marginTop: 4 }}>Adicionales</span>
        <div className="chips">
          {(verAdicionales ? ADICIONALES : ADICIONALES.slice(0, 4)).map((ad) => (
            <button key={ad.desc} type="button" className="chip" style={{ fontSize: 13 }} onClick={() => agregar({ ...ad, adicional: true })}>
              + {ad.desc} <span className="muted" style={{ fontWeight: 500 }}>{pesos(ad.precio)}</span>
            </button>
          ))}
          <button type="button" className="chip" style={{ fontSize: 13, borderStyle: 'dashed' }} aria-expanded={verAdicionales} onClick={() => setVerAdicionales((v) => !v)}>
            {verAdicionales ? 'Ver menos' : `Ver ${ADICIONALES.length - 4} más`}
          </button>
        </div>

        {items.length > 0 && (
          <section className="tarjeta" style={{ padding: '4px 16px' }}>
            <span className="antetitulo" style={{ display: 'block', padding: '12px 0 2px', color: 'var(--v500)' }}>Por enviar · {pesos(totalNuevo)}</span>
            {items.map((x) => (
              <div key={x.key} className="linea" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
                <div className="fila">
                  <b style={{ flex: 1, fontSize: 14 }}>{nombreItem(x)}</b>
                  <span className="muted" style={{ fontSize: 13 }}>{pesos(x.precio)}</span>
                  <button type="button" className="redondo" aria-label={`Quitar ${nombreItem(x)}`} onClick={() => setItems((prev) => prev.filter((i) => i.key !== x.key))}>×</button>
                </div>
                {!x.adicional && (
                  <label className="nota-input">
                    <Icono n="lapiz" size={15} color="var(--v400)" />
                    <input aria-label={`Nota para cocina de ${nombreItem(x)}`} placeholder="Nota para cocina (sin cebolla, término…)" value={x.nota || ''} maxLength={140} onChange={(e) => ponerNota(x.key, e.target.value)} />
                  </label>
                )}
              </div>
            ))}
          </section>
        )}
        {!items.length && !activos.length && <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>Toca un plato para empezar la cuenta.</p>}
      </main>

      <div className="pie-fijo">
        {items.length > 0 ? (
          <button type="button" className="btn-enviar" onClick={enviar} disabled={enviando}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="cnt">{items.length}</span>{enviando ? 'Enviando…' : 'Enviar a cocina'}</span>
            <span className="total">{pesos(totalNuevo)}</span>
          </button>
        ) : listos.length > 0 ? (
          <button type="button" className="btn btn-dorado btn-bloque" style={{ height: 56 }} onClick={() => accion(async () => { for (const p of listos) await entregarPedido(p.id); }, 'Marcado como servido ✓')}>
            Ya lo llevé a la mesa
          </button>
        ) : todoServido && porCobrar.length > 0 ? (
          <button type="button" className="btn btn-primario btn-bloque" style={{ height: 56 }} onClick={() => accion(async () => { for (const p of porCobrar) await pagarPedido(p.id); }, `Mesa ${n} pagada ✓`, true)}>
            Marcar pagada · {pesos(totalCocina)}
          </button>
        ) : (
          <button type="button" className="btn btn-borde btn-bloque" style={{ height: 56 }} onClick={onVolver}>Volver a las mesas</button>
        )}
      </div>

      {quitar && (
        <DialogoQuitar nombre={quitar.nombre} mesa={n} motivoInicial="Error al tomar el pedido" onCerrar={() => setQuitar(null)}
          onConfirmar={async (motivo) => {
            try { await anularItem(quitar.pedido.id, quitar.idx, motivo); mostrarToast('Plato quitado ✓'); setQuitar(null); cargar(); }
            catch (e) { mostrarToast(e.response?.data?.error || 'No se pudo quitar'); }
          }} />
      )}
    </div>
  );
}
