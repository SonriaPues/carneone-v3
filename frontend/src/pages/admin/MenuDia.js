import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Cargando } from '../../components/Piezas';
import { PROTEINAS, ALMUERZO, BANDEJAS, PLATOS_FDS, claveMenu, pesos, kg } from '../../utils/formato';

export default function MenuDia() {
  const { menu, fetchMenu, actualizarMenu, fetchInventario, mostrarToast } = useApp();
  const [inv, setInv] = useState([]);
  useEffect(() => { fetchMenu().catch(() => {}); fetchInventario().then(setInv).catch(() => {}); }, []);

  const cambiar = async (tipo, clave, valor, nombre) => {
    try { await actualizarMenu({ [tipo]: { [clave]: valor } }); mostrarToast(valor ? `${nombre} disponible ✓` : `${nombre} agotado`); }
    catch { mostrarToast('No se pudo cambiar'); }
  };

  if (!menu) return <Cargando />;
  const stock = (p) => inv.find((i) => i.nombre === p);
  const prots = PROTEINAS.map((p) => {
    const s = stock(p);
    const bajo = s && s.stock_actual <= s.stock_minimo_g;
    return { n: p, on: menu.proteinas?.[p] !== false, tipo: 'proteinas', clave: p, sub: s ? `${bajo ? 'Stock bajo · ' : ''}${kg(s.stock_actual)} kg en stock` : '', alerta: bajo };
  });
  const plato = (p, sub) => ({ n: p.plato, on: menu.platos?.[claveMenu(p.plato)] !== false, tipo: 'platos', clave: claveMenu(p.plato), sub: `${pesos(p.precio)}${sub ? ' · ' + sub : ''}` });
  const secciones = [
    { titulo: 'Platos', nota: 'Entre semana', items: [plato(ALMUERZO, 'sin proteína'), ...BANDEJAS.map((b) => plato(b, 'con proteína'))] },
    { titulo: 'Proteínas', nota: `Para las bandejas · ${prots.filter((x) => x.on).length} de ${prots.length}`, items: prots },
    { titulo: 'Fin de semana', nota: 'Sábado y domingo', items: PLATOS_FDS.map((p) => plato(p, 'solo sábado y domingo')) },
  ];

  return (
    <>
      <div className="cab-pag">
        <div><span className="antetitulo">Menú del día</span><h1 className="titulo-pag">Qué se puede pedir hoy</h1></div>
        <span className="insignia i-verde" style={{ fontSize: 14, padding: '10px 16px' }}><span className="punto" style={{ background: 'var(--v500)' }} />Los meseros ven los cambios en segundos</span>
      </div>
      <div className="menu-secciones">
        {secciones.map((s) => (
          <section key={s.titulo} className="tarjeta" style={{ overflow: 'hidden' }}>
            <div className="tarjeta-cab" style={{ paddingBottom: 12 }}><h2 className="titulo-sec">{s.titulo}</h2><span className="muted" style={{ fontSize: 13 }}>{s.nota}</span></div>
            {s.items.map((it) => (
              <div key={it.clave} className={`menu-fila${it.on ? '' : ' off'}`}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <b style={{ fontSize: 15 }}>{it.n}</b>
                  <span style={{ fontSize: 12, fontWeight: 600, color: !it.on ? 'var(--r700)' : it.alerta ? 'var(--d800)' : 'var(--v400)' }}>{!it.on ? 'Agotado' : it.sub}</span>
                </div>
                <button type="button" className="switch" role="switch" aria-checked={it.on} aria-label={`${it.n} disponible`}
                  onClick={() => cambiar(it.tipo, it.clave, !it.on, it.n)}><span /></button>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
