import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Cargando, Vacio } from '../../components/Piezas';
import { PROTEINAS, hoyIso, mananaIso, fechaIsoADia } from '../../utils/formato';

const ayerIso = () => { const d = new Date(hoyIso() + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

const num = (x) => Number(x || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 });

// Acierto = 1 − (suma de diferencias / suma de lo predicho).
function acierto(comp) {
  if (!comp?.comparacion) return null;
  let pred = 0; let dif = 0; let vendido = 0;
  for (const p of PROTEINAS) {
    const d = comp.comparacion[p]; if (!d) continue;
    pred += d.unidades_predichas; dif += Math.abs(d.unidades_reales - d.unidades_predichas); vendido += d.unidades_reales;
  }
  if (!pred || !vendido) return null;
  return Math.max(0, Math.round((1 - dif / pred) * 100));
}

export default function Prediccion() {
  const { fetchPrediccion, fetchComparacion, fetchRecomendacionNeta } = useApp();
  const [fecha, setFecha] = useState(mananaIso());
  const [pred, setPred] = useState(undefined);
  const [rec, setRec] = useState(null);
  const [compHoy, setCompHoy] = useState(null);

  // Se compara el día de ayer, que ya cerró (el de hoy todavía va por la mitad).
  useEffect(() => { fetchComparacion(ayerIso()).then(setCompHoy); }, []);
  useEffect(() => {
    setPred(undefined);
    Promise.all([fetchPrediccion(fecha), fetchRecomendacionNeta(fecha)]).then(([p, r]) => { setPred(p?.prediccion ? p : null); setRec(r); });
  }, [fecha]);

  const totalPlatos = pred ? Math.round(PROTEINAS.reduce((s, p) => s + (pred.prediccion[p]?.unidades_predichas || 0), 0)) : 0;
  const comprar = rec?.recomendacion_neta ? PROTEINAS.filter((p) => rec.recomendacion_neta[p]?.kg_a_comprar > 0) : [];
  const kgComprar = comprar.reduce((s, p) => s + rec.recomendacion_neta[p].kg_a_comprar, 0);
  const pctHoy = acierto(compHoy);
  const maxComp = compHoy?.comparacion ? Math.max(1, ...PROTEINAS.map((p) => Math.max(compHoy.comparacion[p]?.unidades_predichas || 0, compHoy.comparacion[p]?.unidades_reales || 0))) : 1;
  const esManana = fecha === mananaIso();

  return (
    <>
      <div className="cab-pag">
        <div><span className="antetitulo">Predicción de demanda</span><h1 className="titulo-pag">Qué preparar y qué comprar</h1></div>
        <div className="fecha-sel">
          <label htmlFor="fecha-pred" className="etiqueta">Para el día</label>
          <input id="fecha-pred" type="date" className="input" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </div>
      </div>

      {pred === undefined && <Cargando texto="Calculando predicción…" />}
      {pred === null && <Vacio titulo="La predicción no está disponible" texto="Revisa que el servicio de predicción (Python) esté corriendo." />}
      {pred && (
        <>
          <section className="banda-oscura">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 540 }}>
              <span className="antetitulo claro">{esManana ? 'Mañana · ' : ''}{fechaIsoADia(pred.fecha)}</span>
              <span className="num" style={{ fontSize: 26, lineHeight: 1.25 }}>
                Se esperan unas {totalPlatos} bandejas. {comprar.length ? `Hay que comprar ${num(kgComprar)} kg (${comprar.join(', ').toLowerCase()}).` : 'Con lo que hay en stock alcanza.'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--v200)' }}>Modelo: {String(pred.modelo_usado || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())} · {pred.dias_historico} días de historial</span>
            </div>
            <div className="mini-kpis">
              <div className="mini-kpi"><span>Bandejas esperadas</span><b>{totalPlatos}</b></div>
              <div className="mini-kpi dorado"><span>Comprar</span><b>{num(kgComprar)} kg</b></div>
              {pctHoy != null && <div className="mini-kpi"><span>Acierto de ayer</span><b>{pctHoy} %</b></div>}
            </div>
          </section>

          <section className="tarjeta" style={{ overflow: 'hidden' }}>
            <div className="tarjeta-cab" style={{ flexWrap: 'wrap' }}>
              <h2 className="titulo-sec">Lista de compra</h2>
              <span className="muted" style={{ fontSize: 13 }}>Lo que se necesita menos lo que ya hay en stock</span>
            </div>
            <div className="tabla-caja">
              <table className="tabla" style={{ minWidth: 620, fontSize: 15 }}>
                <thead><tr><th>Proteína</th><th className="der">Bandejas</th><th className="der">Se necesitan</th><th className="der">En stock</th><th className="der">Comprar</th></tr></thead>
                <tbody>
                  {PROTEINAS.map((p) => {
                    const d = pred.prediccion[p]; const r = rec?.recomendacion_neta?.[p];
                    if (!d) return null;
                    const c = r?.kg_a_comprar || 0;
                    return (
                      <tr key={p}>
                        <td style={{ fontWeight: 700 }}>{p}</td>
                        <td className="der">{Math.ceil(d.unidades_predichas)}</td>
                        <td className="der" style={{ color: 'var(--v500)' }}>{num(d.kg_predichos)} kg</td>
                        <td className="der" style={{ fontWeight: 600, color: r && r.kg_en_stock < d.kg_predichos ? 'var(--r700)' : 'var(--v600)' }}>{r ? `${num(r.kg_en_stock)} kg` : '—'}</td>
                        <td className="der"><span className="insignia" style={{ minWidth: 72, justifyContent: 'center', fontSize: 14, fontWeight: 800, background: c ? 'var(--d400)' : 'var(--v50)', color: c ? 'var(--v950)' : 'var(--v500)' }}>{c ? `${num(c)} kg` : 'Nada'}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {compHoy?.comparacion && (
        <section className="tarjeta pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="fila entre" style={{ flexWrap: 'wrap' }}>
            <h2 className="titulo-sec">Ayer: predicho contra vendido</h2>
            <div className="leyenda">
              <span><i style={{ background: 'var(--v200)', borderColor: 'var(--v200)' }} />Predicho</span>
              <span><i className="ocupada" />Vendido</span>
            </div>
          </div>
          <div className="comp-grid">
            {PROTEINAS.map((p) => {
              const d = compHoy.comparacion[p]; if (!d) return null;
              const dif = Math.round(d.unidades_reales - d.unidades_predichas);
              return (
                <div key={p} className="comp">
                  <div className="fila entre"><b style={{ fontSize: 14 }}>{p}</b>
                    <span className="num" style={{ fontSize: 13, color: dif > 0 ? 'var(--v600)' : dif < 0 ? 'var(--r700)' : 'var(--v400)' }}>{dif > 0 ? '+' : dif < 0 ? '−' : ''}{Math.abs(dif)}</span></div>
                  <div className="b" style={{ width: `${(d.unidades_predichas / maxComp) * 100}%`, background: 'var(--v200)' }} />
                  <div className="b" style={{ width: `${(d.unidades_reales / maxComp) * 100}%`, background: 'var(--v700)' }} />
                  <span className="muted" style={{ fontSize: 12 }}>{Math.ceil(d.unidades_predichas)} predichos · {d.unidades_reales} vendidos</span>
                </div>
              );
            })}
          </div>
          <span className="muted" style={{ fontSize: 12 }}>+ se vendió más de lo predicho · − se vendió menos</span>
        </section>
      )}
    </>
  );
}
