import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';
const Ctx = createContext();

const leerUsuario = () => {
  try { return JSON.parse(localStorage.getItem('carneone_user')); } catch { return null; }
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(leerUsuario);
  const [toast, setToast] = useState(null);
  const [menu, setMenu] = useState(null);
  const tToast = useRef(null);

  const token = () => { try { return localStorage.getItem('carneone_token'); } catch { return null; } };
  const hdr = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  const mostrarToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(tToast.current);
    tToast.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem('carneone_token'); localStorage.removeItem('carneone_user'); } catch {}
    setUser(null);
  }, []);

  // Si el token vence, se vuelve al ingreso.
  useEffect(() => {
    const id = axios.interceptors.response.use((r) => r, (err) => {
      if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) logout();
      return Promise.reject(err);
    });
    return () => axios.interceptors.response.eject(id);
  }, [logout]);

  const login = async (usuario, password) => {
    const { data } = await axios.post(`${API}/api/auth/login`, { usuario: usuario.trim().toLowerCase(), password });
    const u = { rol: data.rol, nombre: data.nombre };
    try { localStorage.setItem('carneone_token', data.token); localStorage.setItem('carneone_user', JSON.stringify(u)); } catch {}
    setUser(u);
    return data;
  };

  const get = (ruta) => axios.get(`${API}/api${ruta}`, hdr()).then((r) => r.data);
  const post = (ruta, body) => axios.post(`${API}/api${ruta}`, body, hdr()).then((r) => r.data);
  const put = (ruta, body) => axios.put(`${API}/api${ruta}`, body, hdr()).then((r) => r.data);
  const patch = (ruta, body = {}) => axios.patch(`${API}/api${ruta}`, body, hdr()).then((r) => r.data);
  const del = (ruta) => axios.delete(`${API}/api${ruta}`, hdr()).then((r) => r.data);

  const fetchMenu = useCallback(() => get('/menu').then((d) => { setMenu(d); return d; }), []);
  const actualizarMenu = (body) => put('/menu', body).then((d) => { setMenu(d); return d; });

  const valor = {
    user, menu, login, logout, mostrarToast,
    fetchMesas: () => get('/mesas'),
    fetchMenu, actualizarMenu,
    fetchHistorico: (fecha) => get(`/historico?fecha=${fecha}`),
    fetchMeseros: () => get('/meseros'),
    crearMesero: (b) => post('/meseros', b),
    editarMesero: (id, b) => put(`/meseros/${id}`, b),
    eliminarMesero: (id) => del(`/meseros/${id}`),
    fetchPedidosActivos: () => get('/pedidos/activos'),
    crearPedido: (b) => post('/pedidos', b),
    actualizarEstadoPedido: (id, estado) => patch(`/pedidos/${id}/estado`, { estado }),
    entregarPedido: (id) => patch(`/pedidos/${id}/entregar`),
    pagarPedido: (id) => patch(`/pedidos/${id}/pagar`),
    agregarItems: (id, items) => patch(`/pedidos/${id}/items`, { items }),
    anularItem: (id, item_index, motivo) => patch(`/pedidos/${id}/anular-item`, { item_index, motivo }),
    fetchPedidosMesa: (mesaId) => get(`/pedidos/mesa/${mesaId}`),
    fetchResumenCaja: () => get('/pedidos/resumen-caja'),
    fetchTiempos: () => get('/pedidos/tiempos'),
    fetchInventario: () => get('/inventario'),
    fetchMovimientos: () => get('/inventario/movimientos'),
    registrarCompra: (b) => post('/inventario/compra', b),
    registrarMovimiento: (b) => post('/inventario/movimiento', b),
    fetchAlertas: () => get('/inventario/alertas'),
    fetchPrediccion: (f) => get(`/prediccion/predecir?fecha=${f}`).catch(() => null),
    fetchComparacion: (f) => get(`/prediccion/comparacion?fecha=${f}`).catch(() => null),
    fetchRecomendacionNeta: (f) => get(`/prediccion/recomendacion-neta?fecha=${f}`).catch(() => null),
  };

  return (
    <Ctx.Provider value={valor}>
      {children}
      {toast && <div className="toast" role="status">{toast}</div>}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);

// Escucha los cambios de pedidos en vivo (cocina, meseros y caja comparten el canal).
export function useEnVivo(alRecibir) {
  const [conectado, setConectado] = useState(false);
  const cb = useRef(alRecibir);
  cb.current = alRecibir;
  const url = useMemo(() => {
    const base = API || window.location.origin;
    return base.replace(/^http/, 'ws') + '/ws/cocina';
  }, []);

  useEffect(() => {
    let ws; let cerrado = false; let reintento;
    const abrir = () => {
      try {
        ws = new WebSocket(url);
        ws.onopen = () => setConectado(true);
        ws.onmessage = (e) => { try { cb.current(JSON.parse(e.data)); } catch {} };
        ws.onclose = () => { setConectado(false); if (!cerrado) reintento = setTimeout(abrir, 3000); };
        ws.onerror = () => ws.close();
      } catch { reintento = setTimeout(abrir, 3000); }
    };
    abrir();
    return () => { cerrado = true; clearTimeout(reintento); ws && ws.close(); };
  }, [url]);

  return conectado;
}

// Recarga cada cierto tiempo, por si se pierde algún aviso en vivo.
export function useCadaTanto(fn, ms) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => { const t = setInterval(() => ref.current(), ms); return () => clearInterval(t); }, [ms]);
}
