import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Icono, Cargando, Vacio } from '../../components/Piezas';
import { iniciales } from '../../utils/formato';

const ROLES = { mesero: 'Mesero', cocina: 'Cocina', caja: 'Caja', admin: 'Admin' };
const TONO = { mesero: 'i-verde', cocina: 'i-dorado', caja: 'i-azul', admin: 'i-verde' };
const AVATAR = { mesero: ['var(--v100)', 'var(--v800)'], cocina: ['var(--d100)', 'var(--d800)'], caja: ['var(--a100)', 'var(--a800)'], admin: ['var(--v700)', '#fff'] };
const nuevo = { nombre: '', usuario: '', password: '', rol: 'mesero' };

export default function Equipo() {
  const { fetchMeseros, crearMesero, editarMesero, eliminarMesero, mostrarToast } = useApp();
  const [gente, setGente] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [form, setForm] = useState(nuevo);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = () => fetchMeseros().then(setGente).catch(() => setGente([]));
  useEffect(() => { cargar(); }, []);

  const lista = (gente || []).filter((p) => filtro === 'todos' || p.rol === filtro);
  const cuenta = (r) => (gente || []).filter((p) => r === 'todos' || p.rol === r).length;

  const abrirEdicion = (p) => { setEditando(p); setForm({ nombre: p.nombre, usuario: p.usuario, password: '', rol: p.rol }); setError(''); };
  const cerrar = () => { setEditando(null); setForm(nuevo); setError(''); };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.usuario.trim()) return setError('Escribe el nombre y el usuario.');
    if (!editando && form.password.length < 4) return setError('La contraseña debe tener al menos 4 caracteres.');
    setError(''); setGuardando(true);
    const body = { ...form, nombre: form.nombre.trim(), usuario: form.usuario.trim().toLowerCase() };
    try {
      if (editando) { await editarMesero(editando.id, { ...body, activo: editando.activo }); mostrarToast('Cambios guardados ✓'); }
      else { await crearMesero(body); mostrarToast(`${body.nombre} ya puede entrar ✓`); }
      cerrar(); cargar();
    } catch (err) {
      const m = err.response?.data?.error || '';
      setError(m.includes('unique') || m.includes('duplicate') ? 'Ese usuario ya existe. Escoge otro.' : 'No se pudo guardar.');
    } finally { setGuardando(false); }
  };

  const cambiarActivo = async (p) => {
    try {
      if (p.activo) await eliminarMesero(p.id);
      else await editarMesero(p.id, { nombre: p.nombre, usuario: p.usuario, rol: p.rol, activo: true });
      mostrarToast(p.activo ? `${p.nombre} quedó inactivo` : `${p.nombre} activo de nuevo ✓`);
      cerrar(); cargar();
    } catch { mostrarToast('No se pudo cambiar'); }
  };

  return (
    <>
      <div className="cab-pag"><div><span className="antetitulo">Equipo</span><h1 className="titulo-pag">Quién trabaja aquí</h1></div></div>
      <div className="dos-col">
        <div className="ancha" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="chips">
            {['todos', 'mesero', 'cocina', 'caja'].map((r) => (
              <button key={r} type="button" className="chip" aria-pressed={filtro === r} onClick={() => setFiltro(r)}>
                {r === 'todos' ? 'Todos' : ROLES[r] + (r === 'mesero' ? 's' : '')} · {cuenta(r)}
              </button>
            ))}
          </div>
          {!gente && <Cargando />}
          {gente && lista.length === 0 && <Vacio titulo="Nadie con ese rol" texto="Crea un usuario con el formulario." />}
          <div className="gente">
            {lista.map((p) => (
              <article key={p.id} className={`persona${p.activo ? '' : ' inactiva'}`}>
                <span className="avatar" style={{ background: AVATAR[p.rol]?.[0], color: AVATAR[p.rol]?.[1] }}>{iniciales(p.nombre)}</span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <b style={{ fontSize: 15 }}>{p.nombre}{!p.activo && ' · inactivo'}</b>
                  <span className="fila muted" style={{ gap: 8, fontSize: 13 }}>@{p.usuario}<span className={`insignia ${TONO[p.rol]}`}>{ROLES[p.rol] || p.rol}</span></span>
                </div>
                {p.rol !== 'admin' && (
                  <button type="button" className="btn btn-borde btn-icono" aria-label={`Editar a ${p.nombre}`} onClick={() => abrirEdicion(p)}><Icono n="lapiz" size={18} color="var(--v600)" /></button>
                )}
              </article>
            ))}
          </div>
        </div>

        <form className="tarjeta pad angosta" onSubmit={guardar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="fila entre">
            <h2 className="titulo-sec">{editando ? `Editar a ${editando.nombre.split(' ')[0]}` : 'Nuevo usuario'}</h2>
            {editando && <button type="button" className="btn btn-borde" style={{ minHeight: 36 }} onClick={cerrar}>Cancelar</button>}
          </div>
          <div className="campo">
            <label htmlFor="eq-nombre">Nombre completo</label>
            <input id="eq-nombre" className="input" placeholder="Nombre y apellido" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <div className="campo">
              <label htmlFor="eq-usuario">Usuario</label>
              <input id="eq-usuario" className="input" autoCapitalize="none" placeholder="usuario" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="eq-clave">{editando ? 'Nueva clave' : 'Contraseña'}</label>
              <input id="eq-clave" className="input" type="password" autoComplete="new-password" placeholder={editando ? 'Sin cambio' : ''} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <fieldset style={{ border: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <legend className="etiqueta" style={{ marginBottom: 8 }}>Rol</legend>
            <div className="segmento claro">
              {['mesero', 'cocina', 'caja'].map((r) => (
                <button key={r} type="button" aria-pressed={form.rol === r} onClick={() => setForm({ ...form, rol: r })}>{ROLES[r]}</button>
              ))}
            </div>
          </fieldset>
          {error && <div className="aviso rojo" role="alert" style={{ fontSize: 14 }}>{error}</div>}
          <button type="submit" className="btn btn-primario" disabled={guardando}>{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear usuario'}</button>
          {editando && (
            <button type="button" className={editando.activo ? 'btn btn-peligro' : 'btn btn-suave'} onClick={() => cambiarActivo(editando)}>
              {editando.activo ? 'Desactivar (ya no podrá entrar)' : 'Activar de nuevo'}
            </button>
          )}
        </form>
      </div>
    </>
  );
}
