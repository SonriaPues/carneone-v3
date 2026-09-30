import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

const API = process.env.REACT_APP_API_URL || '';
const WS_URL = API.replace('https','wss').replace('http','ws') + '/ws/cocina';
const fmt = n => '$' + (n||0).toLocaleString('es-CO');
const hoy = new Date(); const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

const ESTADO_LABEL = { pendiente:'Pendiente', en_preparacion:'En preparación', listo:'Listo', entregado:'Entregado' };

export default function CocinaApp() {
  const { user, logout, fetchPedidosActivos, actualizarEstadoPedido, entregarPedido, mostrarToast } = useApp();
  const [pedidos, setPedidos] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => { cargar(); conectarWS(); return () => wsRef.current?.close(); }, []);

  const cargar = async () => {
    try { const p = await fetchPedidosActivos(); setPedidos(p); }
    catch {}
  };

  const conectarWS = () => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (['pedido_nuevo','pedido_actualizado','pedido_entregado'].includes(data.tipo)) {
          cargar();
          if (data.tipo === 'pedido_nuevo') mostrarToast(`🔔 Nuevo pedido — Mesa ${data.pedido?.mesa_numero}`);
        }
      };
      ws.onclose = () => setTimeout(conectarWS, 3000);
    } catch {}
  };

  const cambiarEstado = async (id, estado) => {
    try {
      if (estado === 'entregado') await entregarPedido(id);
      else await actualizarEstadoPedido(id, estado);
      mostrarToast(`Estado: ${ESTADO_LABEL[estado]} ✓`);
      cargar();
    } catch { mostrarToast('Error'); }
  };

  const siguienteEstado = (estado) => {
    if (estado === 'pendiente') return 'en_preparacion';
    if (estado === 'en_preparacion') return 'listo';
    if (estado === 'listo') return 'entregado';
    return null;
  };

  const btnLabel = (estado) => {
    if (estado === 'pendiente') return 'Iniciar preparación';
    if (estado === 'en_preparacion') return 'Marcar listo';
    if (estado === 'listo') return 'Entregar';
    return null;
  };

  const activos = pedidos.filter(p => p.estado !== 'pagado' && p.estado !== 'entregado');
  const pendientes = activos.filter(p => p.estado === 'pendiente');
  const enPrep     = activos.filter(p => p.estado === 'en_preparacion');
  const listos     = activos.filter(p => p.estado === 'listo');

  const renderPedido = (p) => {
    const sig = siguienteEstado(p.estado);
    const mins = Math.round((Date.now() - new Date(p.created_at).getTime())/60000);
    return (
      <div key={p.id} className={`comanda ${p.estado}`}>
        <div className="comanda-header">
          <div>
            <span style={{fontSize:15,fontWeight:700,color:'var(--verde-oscuro)'}}>Mesa {p.mesa_numero}</span>
            <span style={{fontSize:11,color:'var(--gris-muted)',marginLeft:8}}>{p.zona} · {mins}min</span>
          </div>
          <span className={`badge badge-${p.estado === 'listo'?'listo':p.estado==='en_preparacion'?'prep':'pendiente'}`}>
            {ESTADO_LABEL[p.estado]}
          </span>
        </div>
        <div style={{padding:'0 14px 10px'}}>
          {(p.items||[]).filter(i=>!i.anulado).map((it,i) => (
            <div key={i} style={{fontSize:14,padding:'5px 0',borderBottom:'1px solid var(--menta-fondo)',
              display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'var(--verde-oscuro)',fontWeight:500}}>{it.proteina}</span>
              <span style={{color:'var(--gris-muted)',fontSize:12}}>{it.plato}</span>
            </div>
          ))}
          <div style={{fontSize:11,color:'var(--gris-muted)',marginTop:6}}>
            {p.mesero_nombre} · {(p.items||[]).filter(i=>!i.anulado).length} plato(s)
          </div>
          {sig && (
            <button className="btn-verde" style={{marginTop:10,padding:'9px'}}
              onClick={() => cambiarEstado(p.id, sig)}>
              {btnLabel(p.estado)}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <nav className="nav">
        <div>
          <div className="nav-title">🍳 Cocina</div>
          <div className="nav-sub">{dias[hoy.getDay()]} {hoy.getDate()}/{hoy.getMonth()+1}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:11,color:'var(--menta)'}}>{activos.length} activos</span>
          <button className="nav-btn" onClick={logout}>Salir</button>
        </div>
      </nav>

      <div style={{display:'flex',gap:6,padding:'10px 16px',background:'#fff',borderBottom:'1px solid var(--borde-suave)'}}>
        {[['Pendientes',pendientes.length,'var(--rojo)'],['En prep.',enPrep.length,'var(--naranja)'],['Listos',listos.length,'var(--verde-claro)']].map(([l,n,c])=>(
          <div key={l} style={{flex:1,textAlign:'center',padding:'8px',borderRadius:8,background:'var(--fondo)'}}>
            <div style={{fontSize:18,fontWeight:700,color:c}}>{n}</div>
            <div style={{fontSize:10,color:'var(--gris-muted)'}}>{l}</div>
          </div>
        ))}
      </div>

      <div className="body-pad">
        {activos.length === 0 && (
          <div style={{textAlign:'center',padding:40,color:'var(--gris-muted)',fontSize:14}}>
            Sin pedidos activos 🎉
          </div>
        )}
        {pendientes.map(renderPedido)}
        {enPrep.map(renderPedido)}
        {listos.map(renderPedido)}
      </div>
    </div>
  );
}
