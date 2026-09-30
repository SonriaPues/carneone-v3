import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Inicio() {
  const { login, mostrarToast } = useApp();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.usuario || !form.password) return mostrarToast('Completa los campos');
    setLoading(true);
    try { await login(form.usuario, form.password); }
    catch { mostrarToast('Credenciales incorrectas'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">🥩 Carneone</div>
        <div className="login-sub">Sistema de gestión v3.0</div>
        <input className="login-input" placeholder="Usuario" value={form.usuario}
          onChange={e => setForm(p => ({ ...p, usuario: e.target.value }))} autoCapitalize="none"/>
        <input className="login-input" type="password" placeholder="Contraseña" value={form.password}
          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        <button className="btn-verde" onClick={handleLogin} disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </div>
  );
}
