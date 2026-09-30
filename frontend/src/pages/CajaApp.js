import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const fmt = n => '$' + (n||0).toLocaleString('es-CO');
const hoy = new Date(); const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

export default function CajaApp() {
  const { user, logout, fetchPedidosActivos, pagarPedido, mostrarToast } = useApp();
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => { cargar(); const t = setInterval(cargar, 10000); return () => clearInterval(t); }, []);

  const cargar = async () => {
    try { setPedidos(await fetchPedidosActivos()); } catch {}
  };

  const cobrar = async (id) => {
    try { await pagarPedido(id); mostrarToast('Cobrado ✓'); cargar(); }
    catch { mostrarToast('Error'); }
  };

  const listos = pedidos.filter(p => p.estado === 'listo' || p.estado === 'entregado');
  const enServicio = pedidos.filter(p => !['listo','entregado','pagado'].includes(p.estado));

  return (
    <div>
      <nav className="nav">
        <div><div className="nav-title">💰 Caja</div><div className="nav-sub">{dias[hoy.getDay()]} {hoy.getDate()}/{hoy.getMonth()+1}</div></div>
        <button className="nav-btn" onClick={logout}>Salir</button>
      </nav>

      <div className="body-pad">
        {listos.length > 0 && (
          <>
            <div className="seccion-title">Listos para cobrar</div>
            {listos.map(p => {
              const total = (p.items||[]).filter(i=>!i.anulado).reduce((s,i)=>s+(i.precio||0),0);
              return (
                <div key={p.id} className="card" style={{padding:'12px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{fontSize:15,fontWeight:700,color:'var(--verde-oscuro)'}}>Mesa {p.mesa_numero}</span>
                    <span style={{fontSize:15,fontWeight:700,color:'var(--verde-oscuro)'}}>{fmt(total)}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--gris-muted)',marginBottom:8}}>
                    {p.mesero_nombre} · {(p.items||[]).filter(i=>!i.anulado).length} platos
                  </div>
                  {(p.items||[]).filter(i=>!i.anulado).map((it,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'3px 0'}}>
                      <span>{it.proteina}</span><span style={{color:'var(--gris-muted)'}}>{fmt(it.precio)}</span>
                    </div>
                  ))}
                  <button className="btn-verde" style={{marginTop:10,padding:'9px'}} onClick={() => cobrar(p.id)}>
                    Cobrar mesa
                  </button>
                </div>
              );
            })}
          </>
        )}

        {enServicio.length > 0 && (
          <>
            <div className="seccion-title">En servicio</div>
            {enServicio.map(p => {
              const total = (p.items||[]).filter(i=>!i.anulado).reduce((s,i)=>s+(i.precio||0),0);
              return (
                <div key={p.id} className="card" style={{padding:'10px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:14,fontWeight:600}}>Mesa {p.mesa_numero}</span>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{fontSize:12,color:'var(--gris-muted)'}}>{fmt(total)}</span>
                      <span className={`badge badge-${p.estado==='en_preparacion'?'prep':'pendiente'}`}>
                        {p.estado==='en_preparacion'?'Preparando':'Pendiente'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {pedidos.length === 0 && (
          <div style={{textAlign:'center',padding:40,color:'var(--gris-muted)',fontSize:14}}>Sin mesas activas</div>
        )}
      </div>
    </div>
  );
}
