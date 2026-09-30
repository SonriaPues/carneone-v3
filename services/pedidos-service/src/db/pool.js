const { Pool } = require('pg');

// Servicio de Pedidos: dueño exclusivo del esquema `pedidos` (numeral 3.2).
// search_path se fija por conexión para que las consultas sin calificar
// (mesas, pedidos, turnos) resuelvan siempre contra este esquema.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', (client) => {
  client.query('SET search_path TO pedidos, public');
});

module.exports = pool;
