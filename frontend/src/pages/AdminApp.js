import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Icono, Marca } from '../components/Piezas';
import { iniciales } from '../utils/formato';
import Resumen from './admin/Resumen';
import Inventario from './admin/Inventario';
import Equipo from './admin/Equipo';
import MenuDia from './admin/MenuDia';
import Prediccion from './admin/Prediccion';

const SECCIONES = [
  { id: 'resumen', texto: 'Resumen', icono: 'grafica', Comp: Resumen },
  { id: 'inventario', texto: 'Inventario', icono: 'caja', Comp: Inventario },
  { id: 'equipo', texto: 'Equipo', icono: 'usuarios', Comp: Equipo },
  { id: 'menu', texto: 'Menú del día', icono: 'menu', Comp: MenuDia },
  { id: 'prediccion', texto: 'Predicción', icono: 'cerebro', Comp: Prediccion },
];

const leerSeccion = () => { try { return localStorage.getItem('carneone_admin_tab') || 'resumen'; } catch { return 'resumen'; } };

export default function AdminApp() {
  const { user, logout, fetchAlertas } = useApp();
  const [tab, setTab] = useState(leerSeccion);
  const [alertas, setAlertas] = useState([]);

  const recargarAlertas = () => fetchAlertas().then(setAlertas).catch(() => {});
  useEffect(() => { recargarAlertas(); }, []);

  const ir = (id) => { setTab(id); try { localStorage.setItem('carneone_admin_tab', id); } catch {} window.scrollTo(0, 0); };
  const actual = SECCIONES.find((s) => s.id === tab) || SECCIONES[0];
  const Comp = actual.Comp;

  return (
    <div className="panel">
      <aside className="lateral">
        <div className="fila entre">
          <Marca sub="Administración" />
          <button type="button" className="btn btn-borde oscuro btn-icono salir-movil" onClick={logout} aria-label="Cerrar sesión"><Icono n="salir" color="var(--v200)" /></button>
        </div>
        <nav aria-label="Panel">
          {SECCIONES.map((s) => (
            <button key={s.id} type="button" aria-current={actual.id === s.id ? 'page' : undefined} onClick={() => ir(s.id)}>
              <span><Icono n={s.icono} size={19} />{s.texto}</span>
              {s.id === 'inventario' && alertas.length > 0 && <span className="contador-d">{alertas.length}</span>}
            </button>
          ))}
        </nav>
        <div className="usuario-lat">
          <span className="avatar">{iniciales(user?.nombre)}</span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{user?.nombre}</span>
            <span style={{ fontSize: 12, color: 'var(--v200)' }}>Administrador</span>
          </span>
          <button type="button" className="btn-icono" onClick={logout} aria-label="Cerrar sesión"
            style={{ border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icono n="salir" size={18} color="var(--v200)" />
          </button>
        </div>
      </aside>
      <main className="contenido">
        <Comp alertas={alertas} recargarAlertas={recargarAlertas} ir={ir} />
      </main>
    </div>
  );
}
