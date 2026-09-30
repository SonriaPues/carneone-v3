require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const pool = require('./db/pool');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Rutas API
const pedidosRouter = require('./routes/pedidos');
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/mesas',      require('./routes/mesas'));
app.use('/api/pedidos',    pedidosRouter);
app.use('/api/menu',       require('./routes/menu'));
app.use('/api/meseros',    require('./routes/meseros'));
app.use('/api/historico',  require('./routes/historico'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/prediccion', require('./routes/prediccion'));

app.get('/health', (req, res) => res.json({ status: 'ok', version: '3.0.0' }));

// Servir frontend
app.use(express.static(path.join(__dirname, '../build'), {
  setHeaders: (res, fp) => {
    if (fp.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// Servidor HTTP + WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/cocina' });
pedidosRouter.setWss(wss);

wss.on('connection', (ws) => {
  console.log('Cocina conectada via WebSocket');
  ws.on('close', () => console.log('Cocina desconectada'));
});

// Inicializar BD
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meseros (
      id SERIAL PRIMARY KEY, nombre TEXT NOT NULL, usuario TEXT UNIQUE NOT NULL,
      password_hash TEXT, rol TEXT DEFAULT 'mesero', activo BOOLEAN DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS mesas (
      id SERIAL PRIMARY KEY, numero INT UNIQUE NOT NULL, zona TEXT DEFAULT 'salon',
      estado TEXT DEFAULT 'libre', capacidad INT DEFAULT 4
    );
    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY, mesa_id INT, mesa_numero INT, zona TEXT,
      mesero_id INT, mesero_nombre TEXT, items JSONB DEFAULT '[]',
      estado TEXT DEFAULT 'pendiente', comensales INT DEFAULT 1,
      total INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), cerrado_en TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS turnos (
      id SERIAL PRIMARY KEY, mesa_numero INT, zona TEXT,
      mesero_id INT, mesero_nombre TEXT, items JSONB DEFAULT '[]',
      total INT DEFAULT 0, abierto_en TIMESTAMPTZ, cerrado_en TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS menu (
      id INT PRIMARY KEY DEFAULT 1, proteinas JSONB DEFAULT '{}', platos JSONB DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS inventario (
      id SERIAL PRIMARY KEY, nombre TEXT UNIQUE NOT NULL,
      stock_actual INT DEFAULT 0, stock_minimo_g INT DEFAULT 500,
      unidad TEXT DEFAULT 'g', updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS movimientos_inventario (
      id SERIAL PRIMARY KEY, insumo_nombre TEXT, tipo TEXT,
      cantidad_g INT, motivo TEXT, referencia_pedido_id INT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO inventario (nombre, stock_minimo_g) VALUES
      ('Carne',500),('Cerdo',500),('Pechuga',500),('Costillas',500),('Mojarra',500),('Trucha',500)
    ON CONFLICT (nombre) DO NOTHING;
  `);

  // Seed admin y caja si no existen
  const bcrypt = require('bcryptjs');
  const { rows } = await pool.query("SELECT id FROM meseros WHERE rol='admin'");
  if (!rows.length) {
    const hash = await bcrypt.hash(process.env.CLAVE_ADMIN || '4carneone', 10);
    await pool.query(
      "INSERT INTO meseros (nombre,usuario,password_hash,rol) VALUES ('Administrador','admin',$1,'admin') ON CONFLICT DO NOTHING",
      [hash]
    );
    await pool.query(
      "INSERT INTO meseros (nombre,usuario,password_hash,rol) VALUES ('Caja','caja',$1,'caja') ON CONFLICT DO NOTHING",
      [hash]
    );
  }

  // Mesas del 1 al 29
  for (let i = 1; i <= 29; i++) {
    const zona = i <= 8 ? 'salon' : i <= 16 ? 'terraza' : i <= 22 ? 'afuera' : 'cuarto';
    await pool.query(
      'INSERT INTO mesas (numero, zona) VALUES ($1,$2) ON CONFLICT (numero) DO NOTHING',
      [i, zona]
    );
  }
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  await initDB();
  console.log(`Carneone API v3 en puerto ${PORT} ✓`);
});
