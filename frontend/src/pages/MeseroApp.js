import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import MapaMesas from '../components/MapaMesas';

const API = process.env.REACT_APP_API_URL || '';
const PROTEINAS = ['Carne','Pechuga','Cerdo','Costillas','Mojarra','Trucha'];
const PLATOS = ['Almuerzo del día','Bandeja con sopa','Bandeja sin sopa'];
const PLATOS_FDS = ['Frijolada','Arroz Carneone'];
const fmt = n => '$' + (n||0).toLocaleString('es-CO');
const hoy = new Date(); const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

export default function MeseroApp() {
  const { user, logout, fetchMesas, fetchMenu, crearPedido, pagarPedido, agregarItems, fetchPedidosMesa, mostrarToast } = useApp();
  const [mesas, setMesas]     = useState([]);
  const [menu, setMenu]       = useState({ proteinas:{}, platos:{} });
  const [mesaActiva, setMesaActiva] = useState(null);
  const [pedidosMesa, setPedidosMesa] = useState([]);
  const [items, setItems]     = useState([]);
  const [comensales, setComensales] = useState(2);
  const [tab, setTab]         = useState('mesas');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [m, mn] = await Promise.all([fetchMesas(), fetchMenu()]);
      setMesas(m); setMenu(mn);
    } catch {}
  };

  const seleccionarMesa = async (mesa) => {
    setMesaActiva(mesa);
    try {
      const p = await fetchPedidosMesa(mesa.id);
      setPedidosMesa(p);
    } catch {}
    setItems([]);
    setTab('pedido');
  };

  const toggleItem = (proteina, plato) => {
    const key = `${proteina}|${plato}`;
    setItems(prev => {
      const idx = prev.findIndex(i => i.key === key);
      if (idx >= 0) {
        const nuevo = [...prev]; nuevo.splice(idx,1); return nuevo;
      }
      return [...prev, { key, proteina, plato, precio: 14000 }];
    });
  };

  const enviarPedido = async () => {
    if (!items.length) return mostrarToast('Agrega al menos un plato');
    try {
      // Si ya hay pedido activo, agrega items; si no, crea uno nuevo
      if (pedidosMesa.length) {
        await agregarItems(pedidosMesa[0].id, items);
        mostrarToast('Platos agregados ✓');
      } else {
        await crearPedido({ mesa_id: mesaActiva.id, mesa_numero: mesaActiva.numero, zona: mesaActiva.zona, items, comensales });
        mostrarToast('Pedido enviado a cocina ✓');
      }
      setItems([]); cargar();
      const p = await fetchPedidosMesa(mesaActiva.id);
      setPedidosMesa(p);
    } catch (e) { mostrarToast('Error al enviar pedido'); }
  };

  const marcarPagada = async (pedido_id) => {
    try { await pagarPedido(pedido_id); mostrarToast('Mesa pagada ✓'); cargar(); setTab('mesas'); }
    catch { mostrarToast('Error'); }
  };

  const protDisp = PROTEINAS.filter(p => menu.proteinas?.[p] !== false);
  const totalActual = items.reduce((s,i) => s + i.precio, 0);

  return (
    <div>
      <nav className="nav">
        <div><div className="nav-title">Mesero — {user?.nombre}</div><div className="nav-sub">{dias[hoy.getDay()]} {hoy.getDate()}/{hoy.getMonth()+1}</div></div>
        <button className="nav-btn" onClick={logout}>Salir</button>
      </nav>

      {tab === 'mesas' && (
        <>
          <div style={{padding:'12px 16px 4px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:13,fontWeight:600,color:'var(--verde-oscuro)'}}>Mesas</span>
            <span style={{fontSize:11,color:'var(--gris-muted)'}}>{mesas.filter(m=>m.estado==='ocupada').length} ocupadas</span>
          </div>
          <MapaMesas mesas={mesas} onMesaClick={seleccionarMesa} />
        </>
      )}

      {tab === 'pedido' && mesaActiva && (
        <div className="body-pad">
          <button className="btn-outline" style={{marginBottom:12}} onClick={() => { setTab('mesas'); cargar(); }}>← Volver</button>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--verde-oscuro)'}}>Mesa {mesaActiva.numero} — {mesaActiva.zona}</div>
            <div style={{fontSize:12,color:'var(--gris-muted)'}}>
              Comensales: <select value={comensales} onChange={e=>setComensales(+e.target.value)}
                style={{border:'1px solid var(--borde-suave)',borderRadius:6,padding:'2px 6px',fontSize:12}}>
                {[1,2,3,4,5,6,7,8].map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Pedidos activos */}
          {pedidosMesa.length > 0 && (
            <>
              <div className="seccion-title">Pedido activo</div>
              {pedidosMesa.map(p => (
                <div key={p.id} className="card" style={{padding:'10px 14px',marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span className={`badge badge-${p.estado === 'listo' ? 'listo' : p.estado === 'en_preparacion' ? 'prep' : 'pendiente'}`}>
                      {p.estado === 'listo' ? 'Listo' : p.estado === 'en_preparacion' ? 'En preparación' : 'Pendiente'}
                    </span>
                    {p.estado === 'listo' && (
                      <button className="btn-verde" style={{width:'auto',padding:'6px 14px',fontSize:12,marginTop:0}}
                        onClick={() => marcarPagada(p.id)}>Marcar pagada</button>
                    )}
                  </div>
                  {(p.items||[]).filter(i=>!i.anulado).map((it,idx) => (
                    <div key={idx} style={{fontSize:13,color:'var(--verde-oscuro)',padding:'4px 0',borderBottom:'1px solid var(--menta-fondo)'}}>
                      {it.proteina} — {it.plato}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* Agregar nuevos platos */}
          <div className="seccion-title">Agregar platos</div>
          <div className="card" style={{padding:'10px 14px',marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--gris-muted)',marginBottom:8}}>PROTEÍNA</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
              {protDisp.map(p => {
                const sel = items.some(i => i.proteina === p);
                return (
                  <button key={p} onClick={() => toggleItem(p, 'Almuerzo del día')}
                    style={{padding:'7px 14px',borderRadius:20,border:`1px solid ${sel?'var(--verde-claro)':'var(--borde-suave)'}`,
                      background:sel?'var(--menta-fondo)':'#fff',color:sel?'var(--verde-oscuro)':'var(--gris-muted)',
                      fontSize:13,cursor:'pointer',fontWeight:sel?600:400}}>
                    {p}
                  </button>
                );
              })}
              {menu.proteinas && Object.keys(menu.proteinas).filter(k=>menu.proteinas[k]===false).map(p=>(
                <button key={p} disabled style={{padding:'7px 14px',borderRadius:20,border:'1px solid var(--borde-suave)',
                  background:'var(--rojo-fondo)',color:'var(--rojo)',fontSize:13,opacity:.6}}>
                  {p} — Agotado
                </button>
              ))}
            </div>
          </div>

          {items.length > 0 && (
            <div className="card" style={{padding:'10px 14px',marginBottom:10}}>
              <div className="seccion-title" style={{marginTop:0}}>Resumen</div>
              {items.map((it,i) => (
                <div key={i} className="item-row">
                  <span style={{flex:1,fontSize:13}}>{it.proteina}</span>
                  <span style={{fontSize:13,color:'var(--gris-muted)'}}>{fmt(it.precio)}</span>
                  <button className="qty-btn" onClick={() => setItems(p => p.filter((_,j)=>j!==i))}>✕</button>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:8,paddingTop:8,borderTop:'1px solid var(--borde-suave)'}}>
                <span style={{fontSize:13,fontWeight:600}}>Total estimado</span>
                <span style={{fontSize:13,fontWeight:700,color:'var(--verde-oscuro)'}}>{fmt(totalActual)}</span>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <button className="btn-verde" onClick={enviarPedido}>
              Enviar a cocina ({items.length} plato{items.length!==1?'s':''})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
