const { Pool } = require('pg');

// Servicio de Inventario: dueño exclusivo del esquema `inventario` (numeral 3.2).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', (client) => {
  client.query('SET search_path TO inventario, public');
});

module.exports = pool;
