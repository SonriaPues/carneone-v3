import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Icono, Marca } from '../components/Piezas';

const ROLES = [['Mesero', 'var(--v500)'], ['Cocina', 'var(--d500)'], ['Caja', '#598EBA'], ['Admin', 'var(--v800)']];

export default function Inicio() {
  const { login } = useApp();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    if (!form.usuario || !form.password) return setError('Escribe tu usuario y tu contraseña.');
    setError(''); setLoading(true);
    try { await login(form.usuario, form.password); }
    catch (err) { setError(err.response ? 'Usuario o contraseña incorrectos.' : 'No hay conexión con el servidor.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="ingreso">
      <div className="ingreso-cab">
        <Marca sub="Sistema del restaurante" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="antetitulo claro">Buen servicio hoy</span>
          <h1>Entra a tu turno</h1>
          <p>Con tu usuario el sistema abre tu pantalla: mesas, cocina, caja o administración.</p>
        </div>
      </div>
      <form className="ingreso-form" onSubmit={entrar} noValidate>
        {error && <div className="ingreso-error" role="alert">{error}</div>}
        <div className="campo">
          <label htmlFor="usuario">Usuario</label>
          <input id="usuario" className="input" autoComplete="username" autoCapitalize="none" autoCorrect="off"
            placeholder="ej. laura" value={form.usuario} onChange={(e) => setForm((p) => ({ ...p, usuario: e.target.value }))} />
        </div>
        <div className="campo">
          <label htmlFor="clave">Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input id="clave" className="input" type={ver ? 'text' : 'password'} autoComplete="current-password"
              style={{ paddingRight: 52 }} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            <button type="button" className="btn-icono" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              style={{ position: 'absolute', right: 3, top: 3, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icono n={ver ? 'ojoNo' : 'ojo'} color="var(--v400)" />
            </button>
          </div>
        </div>
        <button type="submit" className="btn btn-primario btn-bloque" style={{ height: 54, marginTop: 6, fontSize: 16 }} disabled={loading}>
          {loading ? 'Ingresando…' : <>Ingresar <Icono n="flecha" size={18} color="var(--d400)" grosor={2.2} /></>}
        </button>
        <div className="roles" aria-hidden="true">
          {ROLES.map(([n, c]) => <div key={n}><i style={{ background: c }} />{n}</div>)}
        </div>
        <p className="muted" style={{ textAlign: 'center', fontSize: 12 }}>¿Olvidaste tu clave? Pídesela al administrador.</p>
      </form>
    </div>
  );
}
