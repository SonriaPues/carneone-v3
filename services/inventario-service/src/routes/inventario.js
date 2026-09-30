const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const internal = require('../middleware/internal');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM inventario ORDER BY nombre');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/compra', auth, async (req, res) => {
  const { insumo_nombre, cantidad_g } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE inventario SET stock_actual = stock_actual + $1 WHERE nombre=$2', [cantidad_g, insumo_nombre]);
    await client.query(
      `INSERT INTO movimientos_inventario (insumo_nombre, tipo, cantidad_g, motivo, created_at)
       VALUES ($1,'entrada',$2,'compra',NOW())`,
      [insumo_nombre, cantidad_g]
    );
    await client.query('COMMIT');
    const { rows } = await pool.query('SELECT * FROM inventario WHERE nombre=$1', [insumo_nombre]);
    res.json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.patch('/:nombre/stock-minimo', auth, async (req, res) => {
  try {
    const { stock_minimo_g } = req.body;
    const { rows } = await pool.query(
      'UPDATE inventario SET stock_minimo_g=$1 WHERE nombre=$2 RETURNING *',
      [stock_minimo_g, req.params.nombre]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/alertas', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM inventario WHERE stock_actual <= stock_minimo_g ORDER BY nombre');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/movimientos', auth, async (req, res) => {
  try {
    const { fecha } = req.query;
    const f = fecha || new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(
      'SELECT * FROM movimientos_inventario WHERE DATE(created_at)=$1 ORDER BY created_at DESC',
      [f]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/movimiento', auth, async (req, res) => {
  const { insumo_nombre, tipo, cantidad_g, motivo } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const op = tipo === 'entrada' ? '+' : '-';
    await client.query(`UPDATE inventario SET stock_actual = stock_actual ${op} $1 WHERE nombre=$2`, [cantidad_g, insumo_nombre]);
    await client.query(
      `INSERT INTO movimientos_inventario (insumo_nombre, tipo, cantidad_g, motivo, created_at)
       VALUES ($1,$2,$3,$4,NOW())`,
      [insumo_nombre, tipo, cantidad_g, motivo]
    );
    await client.query('COMMIT');
    const { rows } = await pool.query('SELECT * FROM inventario WHERE nombre=$1', [insumo_nombre]);
    res.json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

// --- Endpoints internos (numeral 3.2/3.3): consumidos por otros servicios,
// nunca por clientes finales. Requieren la cabecera x-internal-key.

// Consultado por prediccion-service para calcular la compra neta
// (Demanda_predicha × (1+%merma) + Stock_seguridad − Inventario_actual, numeral 3.5.2).
router.get('/internal/stock', internal, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT nombre, stock_actual, stock_minimo_g FROM inventario');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Invocado por pedidos-service al confirmar la entrega de un pedido (RF-21),
// en vez de que pedidos-service escriba directamente sobre el esquema `inventario`.
router.post('/internal/descontar', internal, async (req, res) => {
  const { items, pedido_id } = req.body; // items: [{ proteina, gramos }]
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { proteina, gramos } of items || []) {
      await client.query(
        'UPDATE inventario SET stock_actual = stock_actual - $1 WHERE nombre=$2 AND stock_actual >= $1',
        [gramos, proteina]
      );
      await client.query(
        `INSERT INTO movimientos_inventario (insumo_nombre, tipo, cantidad_g, motivo, referencia_pedido_id, created_at)
         VALUES ($1,'salida',$2,'venta',$3,NOW())`,
        [proteina, gramos, pedido_id]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

module.exports = router;
