import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';
const Ctx = createContext();

export function AppProvider({ children }) {
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('carneone_user')); } catch { return null; }
  });
  const [toast, setToast] = useState(null);
  const [menu,  setMenu]  = useState(null);

  const token = () => localStorage.getItem('carneone_token');
  const hdr   = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  const mostrarToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const login = async (usuario, password) => {
    const { data } = await axios.post(`${API}/api/auth/login`, { usuario, password });
    localStorage.setItem('carneone_token', data.token);
    localStorage.setItem('carneone_user', JSON.stringify({ rol: data.rol, nombre: data.nombre }));
    setUser({ rol: data.rol, nombre: data.nombre });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('carneone_token');
    localStorage.removeItem('carneone_user');
    setUser(null);
  };

  const fetchMesas    = () => axios.get(`${API}/api/mesas`, hdr()).then(r => r.data);
  const fetchMenu     = useCallback(() => axios.get(`${API}/api/menu`, hdr()).then(r => { setMenu(r.data); return r.data; }), []);
  const actualizarMenu = (body) => axios.put(`${API}/api/menu`, body, hdr()).then(r => { setMenu(r.data); return r.data; });
  const fetchHistorico = (fecha) => axios.get(`${API}/api/historico?fecha=${fecha}`, hdr()).then(r => r.data);
  const fetchMeseros  = () => axios.get(`${API}/api/meseros`, hdr()).then(r => r.data);
  const crearMesero   = (body) => axios.post(`${API}/api/meseros`, body, hdr()).then(r => r.data);
  const editarMesero  = (id, body) => axios.put(`${API}/api/meseros/${id}`, body, hdr()).then(r => r.data);
  const eliminarMesero = (id) => axios.delete(`${API}/api/meseros/${id}`, hdr()).then(r => r.data);

  const fetchPedidosActivos = () => axios.get(`${API}/api/pedidos/activos`, hdr()).then(r => r.data);
  const crearPedido   = (body) => axios.post(`${API}/api/pedidos`, body, hdr()).then(r => r.data);
  const actualizarEstadoPedido = (id, estado) => axios.patch(`${API}/api/pedidos/${id}/estado`, { estado }, hdr()).then(r => r.data);
  const entregarPedido = (id) => axios.patch(`${API}/api/pedidos/${id}/entregar`, {}, hdr()).then(r => r.data);
  const pagarPedido   = (id) => axios.patch(`${API}/api/pedidos/${id}/pagar`, {}, hdr()).then(r => r.data);
  const agregarItems  = (id, items) => axios.patch(`${API}/api/pedidos/${id}/items`, { items }, hdr()).then(r => r.data);
  const fetchPedidosMesa = (mesa_id) => axios.get(`${API}/api/pedidos/mesa/${mesa_id}`, hdr()).then(r => r.data);

  const fetchInventario = () => axios.get(`${API}/api/inventario`, hdr()).then(r => r.data);
  const registrarCompra = (body) => axios.post(`${API}/api/inventario/compra`, body, hdr()).then(r => r.data);
  const registrarMovimiento = (body) => axios.post(`${API}/api/inventario/movimiento`, body, hdr()).then(r => r.data);
  const fetchAlertas  = () => axios.get(`${API}/api/inventario/alertas`, hdr()).then(r => r.data);

  const fetchPrediccion = (fecha) => axios.get(`${API}/api/prediccion/predecir?fecha=${fecha}`, hdr()).then(r => r.data).catch(() => null);
  const fetchComparacion = (fecha) => axios.get(`${API}/api/prediccion/comparacion?fecha=${fecha}`, hdr()).then(r => r.data).catch(() => null);
  const fetchRecomendacionNeta = (fecha) => axios.get(`${API}/api/prediccion/recomendacion-neta?fecha=${fecha}`, hdr()).then(r => r.data).catch(() => null);

  return (
    <Ctx.Provider value={{
      user, menu, toast, login, logout, mostrarToast,
      fetchMesas, fetchMenu, actualizarMenu,
      fetchHistorico, fetchMeseros, crearMesero, editarMesero, eliminarMesero,
      fetchPedidosActivos, crearPedido, actualizarEstadoPedido, entregarPedido, pagarPedido, agregarItems, fetchPedidosMesa,
      fetchInventario, registrarCompra, registrarMovimiento, fetchAlertas,
      fetchPrediccion, fetchComparacion, fetchRecomendacionNeta
    }}>
      {children}
      {toast && <div className="toast">{toast}</div>}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
