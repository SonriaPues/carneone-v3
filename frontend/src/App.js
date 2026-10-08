import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Inicio    from './pages/Inicio';
import MeseroApp from './pages/MeseroApp';
import CocinaApp from './pages/CocinaApp';
import CajaApp   from './pages/CajaApp';
import AdminApp  from './pages/AdminApp';
import './index.css';

function Router() {
  const { user } = useApp();
  if (!user) return <Inicio />;
  if (user.rol === 'admin')   return <AdminApp />;
  if (user.rol === 'cocina')  return <CocinaApp />;
  if (user.rol === 'caja')    return <CajaApp />;
  return <MeseroApp />;
}

export default function App() {
  return <AppProvider><Router /></AppProvider>;
}
