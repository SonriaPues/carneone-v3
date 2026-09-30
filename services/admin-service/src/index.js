require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db/pool');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/meseros', require('./routes/meseros'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/historico', require('./routes/historico'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'admin-service', version: '4.0.0' }));

async function initDB() {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS admin;
    CREATE TABLE IF NOT EXISTS admin.meseros (
      id SERIAL PRIMARY KEY, nombre TEXT NOT NULL, usuario TEXT UNIQUE NOT NULL,
      password_hash TEXT, rol TEXT DEFAULT 'mesero', activo BOOLEAN DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS admin.menu (
      id INT PRIMARY KEY DEFAULT 1, proteinas JSONB DEFAULT '{}', platos JSONB DEFAULT '{}'
    );
  `);

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
}

const PORT = process.env.PORT || 4003;
app.listen(PORT, async () => {
  await initDB();
  console.log(`Carneone Admin-Service v4 en puerto ${PORT} (esquema: admin) ✓`);
});
