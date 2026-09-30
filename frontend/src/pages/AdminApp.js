import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const fmt = n => '$' + (n||0).toLocaleString('es-CO');
const hoy = new Date();
const fechaHoy = hoy.toISOString().split('T')[0];
const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const PROTEINAS = ['Carne','Pechuga','Cerdo','Costillas','Mojarra','Trucha'];
const PLATOS_PPAL = ['Almuerzo del día','Bandeja con sopa','Bandeja sin sopa'];
const PLATOS_FDS  = ['Frijolada','Arroz Carneone'];

export default function AdminApp() {
  const { user, logout, menu, fetchMenu, actualizarMenu,
          fetchHistorico, fetchMeseros, crearMesero, editarMesero, eliminarMesero,
          fetchInventario, registrarCompra, registrarMovimiento, fetchAlertas,
          fetchPrediccion, fetchComparacion, fetchRecomendacionNeta, mostrarToast } = useApp();

  const [tab, setTab] = useState('historico');
  const [fecha, setFecha] = useState(fechaHoy);
  const [historico, setHistorico] = useState(null);
  const [meseros, setMeseros] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [prediccion, setPrediccion] = useState(null);
  const [comparacion, setComparacion] = useState(null);
  const [recNeta, setRecNeta] = useState(null);
  const [fechaPred, setFechaPred] = useState(fechaHoy);
  const [cargandoPred, setCargandoPred] = useState(false);
  const [modalMesero, setModalMesero] = useState(null);
  const [formMesero, setFormMesero] = useState({ nombre:'', usuario:'', password:'', rol:'mesero' });
  const [modalInv, setModalInv] = useState(null);
  const [formInv, setFormInv] = useState({ insumo_nombre:'Carne', cantidad_g:'', tipo:'entrada', motivo:'compra' });
  const [vistaHist, setVistaHist] = useState('mesas');

  useEffect(() => { fetchMenu(); fetchAlertas().then(setAlertas).catch(()=>{}); }, []);
  useEffect(() => { cargarHistorico(); }, [fecha]);
  useEffect(() => { if(tab==='meseros') cargarMeseros(); }, [tab]);
  useEffect(() => { if(tab==='inventario') cargarInventario(); }, [tab]);
  useEffect(() => { if(tab==='prediccion') cargarPrediccion(); }, [tab, fechaPred]);

  const cargarHistorico = async () => { try { setHistorico(await fetchHistorico(fecha)); } catch {} };
  const cargarMeseros   = async () => { try { setMeseros(await fetchMeseros()); } catch {} };
  const cargarInventario = async () => {
    try { const [inv, al] = await Promise.all([fetchInventario(), fetchAlertas()]); setInventario(inv); setAlertas(al); }
    catch {}
  };
  const cargarPrediccion = async () => {
    setCargandoPred(true);
    try {
      const [p, c, r] = await Promise.all([fetchPrediccion(fechaPred), fetchComparacion(fechaPred), fetchRecomendacionNeta(fechaPred)]);
      setPrediccion(p); setComparacion(c); setRecNeta(r);
    } catch { mostrarToast('Predicción no disponible'); }
    finally { setCargandoPred(false); }
  };

  const guardarMesero = async () => {
    try {
      if (modalMesero.modo === 'crear') await crearMesero(formMesero);
      else await editarMesero(modalMesero.mesero.id, { ...formMesero, activo: true });
      mostrarToast(modalMesero.modo === 'crear' ? 'Mesero creado ✓' : 'Actualizado ✓');
      setModalMesero(null); cargarMeseros();
    } catch (e) { mostrarToast(e.response?.data?.error || 'Error'); }
  };

  const guardarInventario = async () => {
    try {
      if (formInv.tipo === 'entrada' && formInv.motivo === 'compra') {
        await registrarCompra({ insumo_nombre: formInv.insumo_nombre, cantidad_g: +formInv.cantidad_g });
      } else {
        await registrarMovimiento({ ...formInv, cantidad_g: +formInv.cantidad_g });
      }
      mostrarToast('Inventario actualizado ✓'); setModalInv(null); cargarInventario();
    } catch { mostrarToast('Error'); }
  };

  const toggleMenu = async (tipo, key, valor) => {
    try { await actualizarMenu({ [tipo]: { [key]: valor } }); mostrarToast(valor ? 'Disponible ✓' : 'Agotado'); }
    catch { mostrarToast('Error'); }
  };

  const maxProt = historico ? Math.max(...Object.values(historico.conteoProteinas || {}), 1) : 1;

  const tabs = [
    { id:'historico', icon:'ti-chart-bar', label:'Histórico' },
    { id:'inventario', icon:'ti-package', label:'Inventario' },
    { id:'meseros', icon:'ti-users', label:'Meseros' },
    { id:'menu', icon:'ti-menu-2', label:'Menú' },
    { id:'prediccion', icon:'ti-brain', label:'Predicción' },
  ];

  return (
    <div>
      {/* Modales */}
      {modalMesero && (
        <div className="modal-overlay" onClick={() => setModalMesero(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modalMesero.modo === 'crear' ? 'Nuevo usuario' : 'Editar usuario'}</div>
            <input className="login-input" placeholder="Nombre completo" value={formMesero.nombre} onChange={e => setFormMesero(p => ({...p, nombre:e.target.value}))}/>
            <input className="login-input" placeholder="Usuario" value={formMesero.usuario} onChange={e => setFormMesero(p => ({...p, usuario:e.target.value}))} autoCapitalize="none"/>
            <input className="login-input" type="password" placeholder={modalMesero.modo==='editar'?'Nueva contraseña (vacío=sin cambio)':'Contraseña'} value={formMesero.password} onChange={e => setFormMesero(p => ({...p, password:e.target.value}))}/>
            <select className="login-input" value={formMesero.rol} onChange={e => setFormMesero(p => ({...p, rol:e.target.value}))}>
              <option value="mesero">Mesero</option>
              <option value="cocina">Cocina</option>
              <option value="caja">Caja</option>
            </select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:4}}>
              <button className="btn-outline" style={{margin:0}} onClick={() => setModalMesero(null)}>Cancelar</button>
              <button className="btn-verde" style={{margin:0}} onClick={guardarMesero}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {modalInv && (
        <div className="modal-overlay" onClick={() => setModalInv(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Registrar movimiento</div>
            <select className="login-input" value={formInv.insumo_nombre} onChange={e => setFormInv(p=>({...p, insumo_nombre:e.target.value}))}>
              {PROTEINAS.map(p => <option key={p}>{p}</option>)}
            </select>
            <select className="login-input" value={formInv.tipo} onChange={e => setFormInv(p=>({...p, tipo:e.target.value, motivo:e.target.value==='entrada'?'compra':'merma'}))}>
              <option value="entrada">Entrada (compra)</option>
              <option value="salida">Salida (merma/ajuste)</option>
            </select>
            <input className="login-input" type="number" placeholder="Cantidad en gramos" value={formInv.cantidad_g} onChange={e => setFormInv(p=>({...p, cantidad_g:e.target.value}))}/>
            <input className="login-input" placeholder="Motivo" value={formInv.motivo} onChange={e => setFormInv(p=>({...p, motivo:e.target.value}))}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:4}}>
              <button className="btn-outline" style={{margin:0}} onClick={() => setModalInv(null)}>Cancelar</button>
              <button className="btn-verde" style={{margin:0}} onClick={guardarInventario}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <nav className="nav">
        <div><div className="nav-title">Administrador</div><div className="nav-sub">{dias[hoy.getDay()]} {hoy.getDate()}/{hoy.getMonth()+1}</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {alertas.length > 0 && <span style={{background:'var(--rojo)',color:'#fff',borderRadius:'50%',width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700}}>{alertas.length}</span>}
          <button className="nav-btn" onClick={logout}>Salir</button>
        </div>
      </nav>

      <div className="tabs" style={{overflowX:'auto',display:'flex'}}>
        {tabs.map(t => (
          <div key={t.id} className={`tab${tab===t.id?' active':''}`} onClick={() => setTab(t.id)} style={{whiteSpace:'nowrap',fontSize:11}}>
            <i className={`ti ${t.icon}`}></i> {t.label}
          </div>
        ))}
      </div>

      {/* HISTÓRICO */}
      {tab === 'historico' && (
        <div className="body-pad">
          <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
            <span style={{fontSize:12,color:'var(--gris-muted)'}}>Fecha</span>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1px solid var(--borde-suave)',background:'#fff',fontSize:13,color:'var(--verde-oscuro)'}}/>
          </div>
          {historico && <>
            <div className="resumen-grid">
              <div className="res-card"><div className="res-num" style={{fontSize:15}}>{fmt(historico.totalDia)}</div><div className="res-label">Total del día</div></div>
              <div className="res-card"><div className="res-num">{historico.mesasAtendidas}</div><div className="res-label">Mesas atendidas</div></div>
              <div className="res-card"><div className="res-num">{Object.values(historico.conteoProteinas||{}).reduce((s,v)=>s+v,0)}</div><div className="res-label">Proteínas</div></div>
              <div className="res-card"><div className="res-num" style={{fontSize:15}}>{historico.mesasAtendidas?fmt(Math.round(historico.totalDia/historico.mesasAtendidas)):'$0'}</div><div className="res-label">Ticket prom.</div></div>
            </div>
            <div className="seccion-title">Proteínas vendidas</div>
            <div className="card" style={{padding:'10px 14px',marginBottom:12}}>
              {PROTEINAS.map(p => {
                const cant = historico.conteoProteinas?.[p] || 0;
                const pct  = Math.round((cant/maxProt)*100);
                return (
                  <div key={p} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid var(--menta-fondo)'}}>
                    <span style={{fontSize:13,color:'var(--verde-oscuro)',width:70,flexShrink:0}}>{p}</span>
                    <div style={{flex:1}}><div className="prot-bar-bg"><div className="prot-bar" style={{width:pct+'%'}}></div></div></div>
                    <span style={{fontSize:13,fontWeight:600,color:'var(--verde-oscuro)',width:24,textAlign:'right'}}>{cant}</span>
                  </div>
                );
              })}
            </div>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              {['mesas','meseros'].map(v=>(
                <button key={v} onClick={()=>setVistaHist(v)} style={{padding:'7px 14px',borderRadius:20,border:`1px solid ${vistaHist===v?'var(--verde-claro)':'var(--borde-suave)'}`,background:vistaHist===v?'var(--menta-fondo)':'#fff',color:'var(--verde-oscuro)',fontSize:12,cursor:'pointer',fontWeight:vistaHist===v?600:400}}>
                  Por {v}
                </button>
              ))}
            </div>
            {vistaHist==='mesas' && (historico.porMesa||[]).map(m=>(
              <div key={m.mesa} className="card" style={{marginBottom:8,padding:'10px 14px',display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:14,fontWeight:500}}>Mesa {m.mesa}</span>
                <span style={{fontSize:13,color:'var(--gris-muted)'}}>{m.turnos.length} turno(s) · {fmt(m.total)}</span>
              </div>
            ))}
            {vistaHist==='meseros' && (historico.porMesero||[]).map(m=>(
              <div key={m.nombre} className="card" style={{marginBottom:10,overflow:'hidden'}}>
                <div style={{padding:'10px 14px',borderBottom:'1px solid var(--menta-fondo)',display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:14,fontWeight:500,color:'var(--verde-oscuro)'}}>{m.nombre}</span>
                  <span style={{fontSize:12,color:'var(--gris-muted)'}}>{m.turnos.length} mesas · {fmt(m.total)}</span>
                </div>
              </div>
            ))}
          </>}
        </div>
      )}

      {/* INVENTARIO */}
      {tab === 'inventario' && (
        <div className="body-pad">
          {alertas.length > 0 && (
            <div style={{background:'var(--rojo-fondo)',border:'1px solid var(--rojo)',borderRadius:10,padding:'10px 14px',marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--rojo)',marginBottom:4}}>⚠ Stock bajo</div>
              {alertas.map(a => <div key={a.nombre} style={{fontSize:12,color:'var(--rojo)'}}>{a.nombre}: {(a.stock_actual/1000).toFixed(2)} kg</div>)}
            </div>
          )}
          <button className="btn-verde" style={{marginBottom:14}} onClick={() => { setModalInv(true); setFormInv({ insumo_nombre:'Carne', cantidad_g:'', tipo:'entrada', motivo:'compra' }); }}>
            + Registrar movimiento
          </button>
          {inventario.map(inv => {
            const kg = (inv.stock_actual/1000).toFixed(2);
            const bajo = inv.stock_actual <= inv.stock_minimo_g;
            return (
              <div key={inv.nombre} className="inv-item">
                <div>
                  <div style={{fontSize:14,fontWeight:500,color:'var(--verde-oscuro)'}}>{inv.nombre}</div>
                  <div style={{fontSize:11,color:'var(--gris-muted)'}}>Mín: {(inv.stock_minimo_g/1000).toFixed(1)} kg</div>
                </div>
                <div className={`inv-stock ${bajo?'bajo':'ok'}`}>{kg} kg {bajo&&'⚠'}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* MESEROS */}
      {tab === 'meseros' && (
        <div className="body-pad">
          <button className="btn-verde" style={{marginBottom:14}} onClick={() => { setModalMesero({modo:'crear'}); setFormMesero({nombre:'',usuario:'',password:'',rol:'mesero'}); }}>
            + Nuevo usuario
          </button>
          {meseros.map(m => (
            <div key={m.id} className="menu-item">
              <div>
                <div className="menu-item-nombre">{m.nombre}</div>
                <div className="menu-item-detalle">@{m.usuario} · {m.rol}{!m.activo&&' · Inactivo'}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn-outline" style={{margin:0,padding:'6px 12px',fontSize:12}}
                  onClick={() => { setModalMesero({modo:'editar',mesero:m}); setFormMesero({nombre:m.nombre,usuario:m.usuario,password:'',rol:m.rol||'mesero'}); }}>
                  Editar
                </button>
                <button className="btn-rojo" onClick={async()=>{ await eliminarMesero(m.id); cargarMeseros(); mostrarToast('Desactivado'); }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MENÚ */}
      {tab === 'menu' && menu && (
        <div className="body-pad">
          <div className="seccion-title">Proteínas</div>
          {PROTEINAS.map(p => { const disp = menu.proteinas?.[p] !== false; return (
            <div key={p} className={`menu-item${!disp?' agotado':''}`}>
              <div><div className="menu-item-nombre">{p}{!disp&&<span className="badge badge-agotado" style={{marginLeft:6}}>Agotado</span>}</div></div>
              <label className="toggle"><input type="checkbox" checked={disp} onChange={e=>toggleMenu('proteinas',p,e.target.checked)}/><span className="toggle-slider"></span></label>
            </div>);})}
          <div className="seccion-title">Platos principales</div>
          {PLATOS_PPAL.map(p => { const k=p.toLowerCase().replace(/ /g,'_'); const disp=menu.platos?.[k]!==false; return (
            <div key={k} className={`menu-item${!disp?' agotado':''}`}>
              <div><div className="menu-item-nombre">{p}</div></div>
              <label className="toggle"><input type="checkbox" checked={disp} onChange={e=>toggleMenu('platos',k,e.target.checked)}/><span className="toggle-slider"></span></label>
            </div>);})}
          <div className="seccion-title">Fin de semana</div>
          {PLATOS_FDS.map(p => { const k=p.toLowerCase().replace(/ /g,'_'); const disp=menu.platos?.[k]!==false; return (
            <div key={k} className={`menu-item${!disp?' agotado':''}`}>
              <div><div className="menu-item-nombre">{p}<span className="badge badge-fds" style={{marginLeft:6}}>Fin de semana</span></div></div>
              <label className="toggle"><input type="checkbox" checked={disp} onChange={e=>toggleMenu('platos',k,e.target.checked)}/><span className="toggle-slider"></span></label>
            </div>);})}
        </div>
      )}

      {/* PREDICCIÓN */}
      {tab === 'prediccion' && (
        <div className="body-pad">
          <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
            <span style={{fontSize:12,color:'var(--gris-muted)'}}>Fecha</span>
            <input type="date" value={fechaPred} onChange={e=>setFechaPred(e.target.value)}
              style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1px solid var(--borde-suave)',background:'#fff',fontSize:13,color:'var(--verde-oscuro)'}}/>
          </div>

          {cargandoPred && <div style={{textAlign:'center',padding:20,color:'var(--verde-medio)'}}>Calculando predicción...</div>}

          {!cargandoPred && prediccion && <>
            <div style={{fontSize:11,color:'var(--gris-muted)',marginBottom:8}}>
              Modelo: <b>{prediccion.modelo_usado}</b> · {prediccion.dias_historico} días de historial
            </div>
            <div className="seccion-title">Predicción — {prediccion.dia_semana} {prediccion.fecha}</div>
            <div className="card" style={{overflow:'hidden',marginBottom:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 70px 70px',padding:'8px 14px',background:'var(--menta-fondo)',borderBottom:'1px solid var(--borde-suave)'}}>
                {['PROTEÍNA','UNID.','KG'].map(h=><span key={h} style={{fontSize:11,fontWeight:600,color:'var(--verde-oscuro)',textAlign:h==='PROTEÍNA'?'left':'right'}}>{h}</span>)}
              </div>
              {PROTEINAS.map(p => { const d=prediccion.prediccion?.[p]; return d?(
                <div key={p} style={{display:'grid',gridTemplateColumns:'1fr 70px 70px',padding:'10px 14px',borderBottom:'1px solid var(--menta-fondo)'}}>
                  <span style={{fontSize:13,color:'var(--verde-oscuro)'}}>{p}</span>
                  <span style={{fontSize:13,fontWeight:500,textAlign:'right'}}>{Math.ceil(d.unidades_predichas)}</span>
                  <span style={{fontSize:13,color:'var(--gris-muted)',textAlign:'right'}}>{d.kg_predichos}</span>
                </div>):null;})}
            </div>
          </>}

          {!cargandoPred && recNeta && <>
            <div className="seccion-title">Recomendación de compra neta</div>
            <div className="card" style={{overflow:'hidden',marginBottom:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 60px 60px 65px',padding:'8px 14px',background:'var(--menta-fondo)',borderBottom:'1px solid var(--borde-suave)'}}>
                {['PROTEÍNA','PRED.','STOCK','COMPRAR'].map(h=><span key={h} style={{fontSize:10,fontWeight:600,color:'var(--verde-oscuro)',textAlign:h==='PROTEÍNA'?'left':'right'}}>{h}</span>)}
              </div>
              {PROTEINAS.map(p => { const d=recNeta.recomendacion_neta?.[p]; return d?(
                <div key={p} style={{display:'grid',gridTemplateColumns:'1fr 60px 60px 65px',padding:'10px 14px',borderBottom:'1px solid var(--menta-fondo)'}}>
                  <span style={{fontSize:13,color:'var(--verde-oscuro)'}}>{p}</span>
                  <span style={{fontSize:13,color:'var(--gris-muted)',textAlign:'right'}}>{d.kg_predichos}kg</span>
                  <span style={{fontSize:13,color:d.alerta?'var(--rojo)':'var(--verde-claro)',textAlign:'right'}}>{d.kg_en_stock}kg</span>
                  <span style={{fontSize:13,fontWeight:700,color:d.kg_a_comprar>0?'var(--verde-oscuro)':'var(--gris-muted)',textAlign:'right'}}>{d.kg_a_comprar}kg</span>
                </div>):null;})}
            </div>
          </>}

          {!cargandoPred && comparacion && <>
            <div className="seccion-title">Predicho vs Real</div>
            <div className="card" style={{overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 50px 50px 55px',padding:'8px 14px',background:'var(--menta-fondo)',borderBottom:'1px solid var(--borde-suave)'}}>
                {['PROTEÍNA','PRED.','REAL','DIF.'].map(h=><span key={h} style={{fontSize:10,fontWeight:600,color:'var(--verde-oscuro)',textAlign:h==='PROTEÍNA'?'left':'right'}}>{h}</span>)}
              </div>
              {PROTEINAS.map(p => { const d=comparacion.comparacion?.[p]; if(!d)return null;
                const dif=d.diferencia_unidades; const color=dif>0?'#3B6D11':dif<0?'#A32D2D':'var(--gris-muted)';
                return(
                  <div key={p} style={{display:'grid',gridTemplateColumns:'1fr 50px 50px 55px',padding:'10px 14px',borderBottom:'1px solid var(--menta-fondo)'}}>
                    <span style={{fontSize:13,color:'var(--verde-oscuro)'}}>{p}</span>
                    <span style={{fontSize:13,color:'var(--gris-muted)',textAlign:'right'}}>{Math.ceil(d.unidades_predichas)}</span>
                    <span style={{fontSize:13,fontWeight:500,textAlign:'right'}}>{d.unidades_reales}</span>
                    <span style={{fontSize:13,fontWeight:500,color,textAlign:'right'}}>{dif>0?'+':''}{dif}</span>
                  </div>);})}
            </div>
            <div style={{fontSize:11,color:'var(--gris-muted)',marginTop:8}}>+ vendió más · − vendió menos de lo predicho</div>
          </>}

          {!cargandoPred && !prediccion && (
            <div style={{textAlign:'center',padding:24,fontSize:13,color:'var(--gris-muted)'}}>
              Servicio de predicción no disponible.<br/>Verifica que el microservicio Python esté corriendo.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
