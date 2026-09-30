const { Pool } = require('pg');

// Servicio de Panel Administrativo / Usuarios: dueño exclusivo del esquema
// `admin` (numeral 3.2): usuarios (meseros/cocina/caja/admin) y menú.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.on('connect', (client) => {
  client.query('SET search_path TO admin, public');
});

module.exports = pool;
