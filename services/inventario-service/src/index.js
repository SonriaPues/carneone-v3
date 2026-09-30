require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db/pool');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/inventario', require('./routes/inventario'));
// Alias sin prefijo /api para las llamadas internas servicio-a-servicio.
app.use('/', require('./routes/inventario'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'inventario-service', version: '4.0.0' }));

async function initDB() {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS inventario;
    CREATE TABLE IF NOT EXISTS inventario.inventario (
      id SERIAL PRIMARY KEY, nombre TEXT UNIQUE NOT NULL,
      stock_actual INT DEFAULT 0, stock_minimo_g INT DEFAULT 500,
      unidad TEXT DEFAULT 'g', updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS inventario.movimientos_inventario (
      id SERIAL PRIMARY KEY, insumo_nombre TEXT, tipo TEXT,
      cantidad_g INT, motivo TEXT, referencia_pedido_id INT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO inventario.inventario (nombre, stock_minimo_g) VALUES
      ('Carne',500),('Cerdo',500),('Pechuga',500),('Costillas',500),('Mojarra',500),('Trucha',500)
    ON CONFLICT (nombre) DO NOTHING;
  `);
}

const PORT = process.env.PORT || 4002;
app.listen(PORT, async () => {
  await initDB();
  console.log(`Carneone Inventario-Service v4 en puerto ${PORT} (esquema: inventario) ✓`);
});
