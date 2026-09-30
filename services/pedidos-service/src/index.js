require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const pool = require('./db/pool');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const pedidosRouter = require('./routes/pedidos');
app.use('/api/mesas', require('./routes/mesas'));
app.use('/api/pedidos', pedidosRouter);
// Alias sin prefijo /api para el endpoint interno /internal/turnos.
app.use('/', pedidosRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'pedidos-service', version: '4.0.0' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/cocina' });
pedidosRouter.setWss(wss);

wss.on('connection', (ws) => {
  console.log('Cocina conectada via WebSocket');
  ws.on('close', () => console.log('Cocina desconectada'));
});

async function initDB() {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS pedidos;
    CREATE TABLE IF NOT EXISTS pedidos.mesas (
      id SERIAL PRIMARY KEY, numero INT UNIQUE NOT NULL, zona TEXT DEFAULT 'salon',
      estado TEXT DEFAULT 'libre', capacidad INT DEFAULT 4
    );
    CREATE TABLE IF NOT EXISTS pedidos.pedidos (
      id SERIAL PRIMARY KEY, mesa_id INT, mesa_numero INT, zona TEXT,
      mesero_id INT, mesero_nombre TEXT, items JSONB DEFAULT '[]',
      estado TEXT DEFAULT 'pendiente', comensales INT DEFAULT 1,
      total INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), cerrado_en TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS pedidos.turnos (
      id SERIAL PRIMARY KEY, mesa_numero INT, zona TEXT,
      mesero_id INT, mesero_nombre TEXT, items JSONB DEFAULT '[]',
      total INT DEFAULT 0, abierto_en TIMESTAMPTZ, cerrado_en TIMESTAMPTZ
    );
  `);

  for (let i = 1; i <= 29; i++) {
    const zona = i <= 8 ? 'salon' : i <= 16 ? 'terraza' : i <= 22 ? 'afuera' : 'cuarto';
    await pool.query('INSERT INTO mesas (numero, zona) VALUES ($1,$2) ON CONFLICT (numero) DO NOTHING', [i, zona]);
  }
}

const PORT = process.env.PORT || 4001;
server.listen(PORT, async () => {
  await initDB();
  console.log(`Carneone Pedidos-Service v4 en puerto ${PORT} (esquema: pedidos) ✓`);
});
