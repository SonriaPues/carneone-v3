import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Cargando, Vacio } from '../../components/Piezas';
import { PROTEINAS, PORCIONES, kg, cantidadG, hora } from '../../utils/formato';

const vacio = { tipo: 'entrada', insumo_nombre: 'Carne', kilos: '', motivo: '' };

export default function Inventario({ recargarAlertas }) {
  const { fetchInventario, fetchMovimientos, registrarCompra, registrarMovimiento, mostrarToast } = useApp();
  const [inv, setInv] = useState(null);
  const [movs, setMovs] = useState([]);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [verTodos, setVerTodos] = useState(false);

  const cargar = () => {
    fetchInventario().then(setInv).catch(() => setInv([]));
    fetchMovimientos().then(setMovs).catch(() => {});
  };
  useEffect(cargar, []);

  const guardar = async (e) => {
    e.preventDefault();
    const gramos = Math.round(parseFloat(String(form.kilos).replace(',', '.')) * 1000);
    if (!gramos || gramos <= 0) return setError('Escribe la cantidad en kilos, por ejemplo 2,5.');
    if (form.tipo === 'salida' && !form.motivo.trim()) return setError('Escribe el motivo de la salida.');
    setError(''); setGuardando(true);
    try {
      if (form.tipo === 'entrada' && !form.motivo.trim()) await registrarCompra({ insumo_nombre: form.insumo_nombre, cantidad_g: gramos });
      else await registrarMovimiento({ insumo_nombre: form.insumo_nombre, tipo: form.tipo, cantidad_g: gramos, motivo: form.motivo.trim() || 'compra' });
      mostrarToast(`${form.tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${kg(gramos)} kg de ${form.insumo_nombre} ✓`);
      setForm({ ...vacio, insumo_nombre: form.insumo_nombre, tipo: form.tipo });
      cargar(); recargarAlertas();
    } catch { setError('No se pudo guardar. Intenta de nuevo.'); }
    finally { setGuardando(false); }
  };

  return (
    <>
      <div className="cab-pag">
        <div>
          <span className="antetitulo">Inventario de proteínas</span>
          <h1 className="titulo-pag">Lo que hay en la nevera</h1>
          <p className="texto-suave">Cada plato entregado descuenta su porción. Las compras y mermas se registran aquí.</p>
        </div>
      </div>

      <div className="dos-col">
        <div className="ancha">
          {!inv && <Cargando />}
          {inv && (
            <div className="stock-grid">
              {inv.map((s) => {
                const bajo = s.stock_actual <= s.stock_minimo_g;
                const tope = Math.max(s.stock_actual, s.stock_minimo_g, 1) * 1.4;
                return (
                  <article key={s.nombre} className={`stock${bajo ? ' bajo' : ''}`}>
                    <div className="fila entre">
                      <span className="num" style={{ fontSize: 17 }}>{s.nombre}</span>
                      <span className={`insignia ${bajo ? 'i-rojo' : 'i-verde'}`}>{bajo ? 'Stock bajo' : 'Bien'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span className="kg">{kg(s.stock_actual)}</span><span className="muted">kg</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="barra" role="img" aria-label={`${kg(s.stock_actual)} kg de ${kg(s.stock_minimo_g)} kg mínimo`}>
                        <i style={{ width: `${(s.stock_actual / tope) * 100}%` }} />
                        <span className="minimo" style={{ left: `${(s.stock_minimo_g / tope) * 100}%` }} />
                      </div>
                      <span className="muted" style={{ fontSize: 12 }}>
                        Mínimo {kg(s.stock_minimo_g)} kg{PORCIONES[s.nombre] ? ` · alcanza para ~${Math.floor(Math.max(0, s.stock_actual) / PORCIONES[s.nombre])} bandejas` : ''}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <form className="tarjeta pad angosta" onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
          <h2 className="titulo-sec">Registrar movimiento</h2>
          <div className="segmento claro" role="radiogroup" aria-label="Tipo de movimiento">
            <button type="button" role="radio" aria-checked={form.tipo === 'entrada'} onClick={() => setForm({ ...form, tipo: 'entrada' })}>Entrada · compra</button>
            <button type="button" role="radio" aria-checked={form.tipo === 'salida'} onClick={() => setForm({ ...form, tipo: 'salida' })}>Salida · merma</button>
          </div>
          <div className="campo">
            <label htmlFor="inv-prot">Proteína</label>
            <select id="inv-prot" className="input" value={form.insumo_nombre} onChange={(e) => setForm({ ...form, insumo_nombre: e.target.value })}>
              {PROTEINAS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="inv-kg">Cantidad (kg)</label>
            <input id="inv-kg" className="input" inputMode="decimal" placeholder="Ej. 2,5" value={form.kilos} onChange={(e) => setForm({ ...form, kilos: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="inv-mot">Motivo {form.tipo === 'entrada' && <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span>}</label>
            <input id="inv-mot" className="input" placeholder={form.tipo === 'entrada' ? 'Compra en la plaza' : 'Se dañó, ajuste de conteo…'} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
          </div>
          {error && <div className="aviso rojo" role="alert" style={{ fontSize: 14 }}>{error}</div>}
          <button type="submit" className="btn btn-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar movimiento'}</button>
        </form>
      </div>

      <section className="tarjeta" style={{ overflow: 'hidden' }}>
        <div className="tarjeta-cab"><h2 className="titulo-sec">Movimientos de hoy</h2></div>
        {movs.length === 0 ? <div style={{ padding: '0 24px 24px' }}><Vacio titulo="Sin movimientos hoy" /></div> : (
          <div className="tabla-caja">
            <table className="tabla" style={{ minWidth: 560 }}>
              <thead><tr><th>Hora</th><th>Proteína</th><th>Motivo</th><th className="der">Cantidad</th></tr></thead>
              <tbody>
                {(verTodos ? movs : movs.slice(0, 10)).map((m) => {
                  const entra = m.tipo === 'entrada';
                  return (
                    <tr key={m.id}>
                      <td className="muted">{hora(m.created_at)}</td>
                      <td style={{ fontWeight: 600 }}>{m.insumo_nombre}</td>
                      <td>{m.motivo === 'venta' ? `Plato entregado${m.referencia_pedido_id ? ` · pedido ${m.referencia_pedido_id}` : ''}` : m.motivo}</td>
                      <td className="der num" style={{ color: entra ? 'var(--v600)' : 'var(--r700)' }}>{entra ? '+' : '−'}{cantidadG(m.cantidad_g)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {movs.length > 10 && (
              <div style={{ padding: '12px 24px 18px' }}>
                <button type="button" className="btn btn-borde" onClick={() => setVerTodos((v) => !v)}>{verTodos ? 'Ver menos' : `Ver los ${movs.length} movimientos`}</button>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
