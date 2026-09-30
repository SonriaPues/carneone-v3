require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

// API Gateway (numeral 3.1): único punto de entrada del sistema. Enruta cada
// prefijo /api/<módulo> al microservicio dueño de ese módulo y sirve el
// build de producción del frontend. No contiene lógica de negocio propia.

const PEDIDOS_URL = process.env.PEDIDOS_URL || 'http://localhost:4001';
const INVENTARIO_URL = process.env.INVENTARIO_URL || 'http://localhost:4002';
const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:4003';
const PREDICCION_URL = process.env.PREDICCION_URL || 'http://localhost:8000';

const app = express();
app.use(cors({ origin: '*' }));

// --- Pedidos (incluye mesas) ---
const pedidosProxy = createProxyMiddleware({ target: PEDIDOS_URL, changeOrigin: true, ws: true });
app.use('/api/pedidos', pedidosProxy);
app.use('/api/mesas', pedidosProxy);

// --- Inventario ---
app.use('/api/inventario', createProxyMiddleware({ target: INVENTARIO_URL, changeOrigin: true }));

// --- Panel administrativo / usuarios (auth, meseros, menu, historico) ---
const adminProxy = createProxyMiddleware({ target: ADMIN_URL, changeOrigin: true });
app.use('/api/auth', adminProxy);
app.use('/api/meseros', adminProxy);
app.use('/api/menu', adminProxy);
app.use('/api/historico', adminProxy);

// --- Predicción de demanda (FastAPI): reescribe /api/prediccion/x -> /x ---
app.use('/api/prediccion', createProxyMiddleware({
  target: PREDICCION_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/prediccion': '' }
}));

app.get('/health', async (req, res) => {
  const targets = { pedidos: PEDIDOS_URL, inventario: INVENTARIO_URL, admin: ADMIN_URL, prediccion: PREDICCION_URL };
  const estado = {};
  await Promise.all(Object.entries(targets).map(async ([nombre, url]) => {
    try {
      const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
      estado[nombre] = r.ok ? 'ok' : `http_${r.status}`;
    } catch { estado[nombre] = 'no_disponible'; }
  }));
  res.json({ gateway: 'ok', servicios: estado });
});

// --- Frontend (build de producción de React) ---
const buildPath = path.join(__dirname, '../../../frontend/build');
app.use(express.static(buildPath, {
  setHeaders: (res, fp) => {
    if (fp.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(buildPath, 'index.html'));
});

const server = http.createServer(app);
// Reenvía el upgrade de WebSocket de /ws/cocina hacia pedidos-service.
server.on('upgrade', pedidosProxy.upgrade);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Carneone API Gateway v4 en puerto ${PORT} ✓`));
