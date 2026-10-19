import React from 'react';

// Iconos de trazo (sin librerías externas).
const RUTAS = {
  llama: <><path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.6.7-2.7 1.6-3.6.3 1.3 1 2.1 2 2.4C11 8 11 5.5 12 3z"/><path d="M5 21h14"/></>,
  salir: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>,
  mesas: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  lista: <><path d="M9 5h11M9 12h11M9 19h11"/><circle cx="4.5" cy="5" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="19" r="1"/></>,
  menu: <><path d="M3 3h18v4H3zM5 7v13h14V7"/><path d="M10 12h4"/></>,
  campana: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  atras: <path d="M15 18l-6-6 6-6"/>,
  flecha: <path d="M5 12h14M13 6l6 6-6 6"/>,
  reloj: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  lapiz: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>,
  ojo: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  ojoNo: <><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
  grafica: <><path d="M3 3v18h18"/><path d="M8 17V11M13 17V7M18 17v-4"/></>,
  caja: <><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></>,
  usuarios: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/></>,
  cerebro: <><path d="M12 3v18"/><path d="M12 6a3 3 0 0 0-5.2-2A3 3 0 0 0 4 8.5 3 3 0 0 0 4 14a3 3 0 0 0 3 5 3 3 0 0 0 5 1"/><path d="M12 6a3 3 0 0 1 5.2-2A3 3 0 0 1 20 8.5a3 3 0 0 1 0 5.5 3 3 0 0 1-3 5 3 3 0 0 1-5 1"/></>,
  mas: <path d="M12 5v14M5 12h14"/>,
  check: <path d="M5 12l5 5L20 7"/>,
  basura: <><path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/></>,
  alerta: <><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/></>,
};

export function Icono({ n, size = 20, color = 'currentColor', grosor = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={grosor}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{RUTAS[n]}</svg>
  );
}

export function Marca({ claro = true, sub = null, verde = false }) {
  return (
    <div className="marca">
      <span className={`marca-placa${verde ? ' verde' : ''}`}>
        <Icono n="llama" size={22} color={verde ? 'var(--d400)' : 'var(--v950)'} grosor={2} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span className={`marca-nombre${claro ? '' : ' oscuro'}`} style={{ color: claro ? '#fff' : 'var(--v900)' }}>Carne<b>One</b></span>
        {sub && <span className="marca-sub" style={{ color: claro ? 'var(--v200)' : 'var(--v400)' }}>{sub}</span>}
      </span>
    </div>
  );
}

export const Vacio = ({ titulo, texto, oscuro = false }) => (
  <div className={`vacio${oscuro ? ' oscuro' : ''}`}><b>{titulo}</b>{texto && <span>{texto}</span>}</div>
);

export const Cargando = ({ texto = 'Cargando…' }) => <p className="muted" role="status" style={{ padding: '24px 0' }}>{texto}</p>;

// Diálogo para quitar un plato ya enviado, con el motivo (reemplaza al window.prompt).
export function DialogoQuitar({ nombre, mesa, motivoInicial = '', onConfirmar, onCerrar }) {
  const [motivo, setMotivo] = React.useState(motivoInicial);
  const [enviando, setEnviando] = React.useState(false);
  const confirmar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try { await onConfirmar(motivo.trim()); } finally { setEnviando(false); }
  };
  return (
    <div className="velo" onClick={onCerrar}>
      <form className="hoja" role="dialog" aria-modal="true" aria-labelledby="quitar-titulo" onClick={(e) => e.stopPropagation()} onSubmit={confirmar}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="antetitulo">Mesa {mesa}</span>
          <h2 id="quitar-titulo" className="titulo-sec" style={{ fontSize: 20 }}>¿Quitar {nombre}?</h2>
          <span className="texto-suave" style={{ fontSize: 14 }}>Sale de la cuenta. Si ya se entregó, el inventario no se devuelve.</span>
        </div>
        <div className="campo">
          <label htmlFor="motivo-quitar">Motivo</label>
          <input id="motivo-quitar" className="input" autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. error al tomar el pedido" />
        </div>
        <div className="chips">
          {['Error al tomar el pedido', 'El cliente cambió de opinión', 'Devuelto por el cliente'].map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={motivo === m} onClick={() => setMotivo(m)}>{m}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <button type="button" className="btn btn-borde" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn btn-peligro" style={{ background: 'var(--r700)', color: '#fff', border: 0 }} disabled={enviando}>{enviando ? 'Quitando…' : 'Quitar plato'}</button>
        </div>
      </form>
    </div>
  );
}
