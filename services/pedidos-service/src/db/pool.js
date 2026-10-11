const { Pool } = require('pg');

// Servicio de Pedidos: dueño exclusivo del esquema `pedidos` (numeral 3.2).
// search_path se fija por conexión para que las consultas sin calificar
// (mesas, pedidos, turnos) resuelvan siempre contra este esquema.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Límite de conexiones simultáneas: con picos de pedidos, las solicitudes
  // esperan turno en vez de superar el máximo de clientes de la base de datos.
  max: Number(process.env.DB_POOL_MAX || 5),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

pool.on('connect', (client) => {
  client.query('SET search_path TO pedidos, public')
    .catch(e => console.error('No se pudo fijar search_path:', e.message));
});

// Un error en una conexión inactiva no debe tumbar el servicio.
pool.on('error', (e) => console.error('Error en conexión de base de datos:', e.message));

module.exports = pool;
