import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Cargando, Vacio } from '../../components/Piezas';
import { PROTEINAS, pesos, kg, hoyIso, nombreDia, horaCorta } from '../../utils/formato';

const variacion = (hoy, antes) => {
  if (!antes) return null;
  const v = Math.round(((hoy - antes) / antes) * 100);
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} %`;
};

export default function Resumen({ alertas, ir }) {
  const { fetchHistorico } = useApp();
  const [fecha, setFecha] = useState(hoyIso());
  const [h, setH] = useState(null);
  const [vista, setVista] = useState('meseros');
  const [error, setError] = useState(false);

  useEffect(() => {
    setH(null); setError(false);
    fetchHistorico(fecha).then(setH).catch(() => setError(true));
  }, [fecha]);

  const dia = nombreDia(fecha);
  const esHoy = fecha === hoyIso();
  const maxProt = h ? Math.max(1, ...Object.values(h.conteoProteinas || {})) : 1;
  const maxHora = h ? Math.max(1, ...(h.porHora || []).map((x) => x.platos)) : 1;
  const ant = h?.semanaAnterior;
  const varVentas = h && ant ? variacion(h.totalDia, ant.totalDia) : null;

  return (
    <>
      <div className="cab-pag">
        <div>
          <span className="antetitulo">Resumen del día</span>
          <h1 className="titulo-pag">{esHoy ? `Así va el ${dia}` : `Así fue el ${dia}`}</h1>
        </div>
        <div className="fecha-sel">
          <label htmlFor="fecha-res" className="etiqueta">Fecha</label>
          <input id="fecha-res" type="date" className="input" value={fecha} max={hoyIso()} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </div>
      </div>

      {error && <div className="aviso rojo">No se pudo cargar el resumen. Revisa la conexión.</div>}
      {!h && !error && <Cargando />}
      {h && (
        <>
          <div className="kpis">
            <div className="kpi destacado">
              <span className="k">Ventas del día</span>
              <span className="v">{pesos(h.totalDia)}</span>
              <span className="n">{varVentas ? `${varVentas} vs. ${dia} pasado` : `Sin ventas el ${dia} pasado`}</span>
            </div>
            <div className="kpi"><span className="k">Mesas atendidas</span><span className="v">{h.mesasAtendidas}</span>
              <span className="n">{ant ? `${ant.mesasAtendidas} el ${dia} pasado` : ''}</span></div>
            <div className="kpi"><span className="k">Platos servidos</span><span className="v">{h.totalPlatos}</span>
              <span className="n">{h.mesasAtendidas ? `${(h.totalPlatos / h.mesasAtendidas).toLocaleString('es-CO', { maximumFractionDigits: 1 })} por mesa` : '—'}</span></div>
            <div className="kpi"><span className="k">Ticket promedio</span><span className="v">{h.mesasAtendidas ? pesos(h.totalDia / h.mesasAtendidas) : '$0'}</span>
              <span className="n">Por mesa</span></div>
          </div>

          <div className="dos-col">
            <section className="tarjeta pad ancha" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="fila entre">
                <h2 className="titulo-sec">Platos por hora</h2>
                {h.porHora?.length > 0 && <span className="muted" style={{ fontSize: 13 }}>Pico a las {horaCorta(h.porHora.reduce((a, b) => (b.platos > a.platos ? b : a)).hora)}</span>}
              </div>
              {h.porHora?.length ? (
                <>
                  <div className="grafica" role="img" aria-label={`Platos por hora: ${h.porHora.map((x) => `${horaCorta(x.hora)} ${x.platos}`).join(', ')}`}>
                    {h.porHora.map((x) => (
                      <div key={x.hora}><span>{x.platos}</span><i className={x.platos === maxHora ? 'pico' : ''} style={{ height: `${Math.round((x.platos / maxHora) * 170)}px` }} /></div>
                    ))}
                  </div>
                  <div className="grafica-ejes">{h.porHora.map((x) => <span key={x.hora}>{horaCorta(x.hora)}</span>)}</div>
                </>
              ) : <Vacio titulo="Sin platos este día" />}
            </section>

            <section className="tarjeta pad angosta" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 className="titulo-sec">Proteínas vendidas</h2>
              {PROTEINAS.map((p) => {
                const v = h.conteoProteinas?.[p] || 0;
                return (
                  <div key={p} style={{ display: 'grid', gridTemplateColumns: '86px 1fr 32px', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p}</span>
                    <div className="barra"><i style={{ width: `${(v / maxProt) * 100}%` }} /></div>
                    <span className="num" style={{ textAlign: 'right' }}>{v}</span>
                  </div>
                );
              })}
            </section>
          </div>

          <div className="dos-col">
            <section className="tarjeta ancha" style={{ overflow: 'hidden' }}>
              <div className="tarjeta-cab">
                <h2 className="titulo-sec">{vista === 'meseros' ? 'Por mesero' : 'Por mesa'}</h2>
                <div className="segmento claro" style={{ width: 210 }}>
                  <button type="button" aria-pressed={vista === 'meseros'} onClick={() => setVista('meseros')}>Meseros</button>
                  <button type="button" aria-pressed={vista === 'mesas'} onClick={() => setVista('mesas')}>Mesas</button>
                </div>
              </div>
              <div className="tabla-caja">
                <table className="tabla">
                  <thead><tr><th>{vista === 'meseros' ? 'Mesero' : 'Mesa'}</th><th>{vista === 'meseros' ? 'Mesas' : 'Turnos'}</th><th>Platos</th><th className="der">Ventas</th></tr></thead>
                  <tbody>
                    {(vista === 'meseros' ? h.porMesero : h.porMesa).map((r) => (
                      <tr key={r.nombre || r.mesa}>
                        <td style={{ fontWeight: 600 }}>{r.nombre || `Mesa ${r.mesa}`}</td>
                        <td>{r.turnos.length}</td><td>{r.platos}</td>
                        <td className="der" style={{ fontWeight: 700 }}>{pesos(r.total)}</td>
                      </tr>
                    ))}
                    {!(vista === 'meseros' ? h.porMesero : h.porMesa).length && <tr><td colSpan={4} className="muted">Sin datos este día.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            {alertas.length > 0 ? (
              <section className="angosta" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24, borderRadius: 20, background: 'var(--d100)', color: 'var(--d900)' }}>
                <span className="antetitulo" style={{ color: 'var(--d800)' }}>Atención</span>
                <h2 className="titulo-sec">{alertas.length} {alertas.length === 1 ? 'proteína' : 'proteínas'} por debajo del mínimo</h2>
                {alertas.map((a) => (
                  <div key={a.nombre} className="fila entre" style={{ fontSize: 14 }}><span>{a.nombre}</span><b>{kg(a.stock_actual)} kg · mín. {kg(a.stock_minimo_g)} kg</b></div>
                ))}
                <button type="button" className="btn" style={{ alignSelf: 'flex-start', background: 'var(--v950)', color: '#fff', marginTop: 6 }} onClick={() => ir('inventario')}>Ir a inventario</button>
              </section>
            ) : (
              <section className="angosta" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 24, borderRadius: 20, background: 'var(--v50)' }}>
                <span className="antetitulo" style={{ color: 'var(--v600)' }}>Inventario</span>
                <h2 className="titulo-sec">Todo por encima del mínimo</h2>
                <span className="texto-suave" style={{ fontSize: 14 }}>No hay proteínas con stock bajo.</span>
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}
