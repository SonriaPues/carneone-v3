const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

let wss = null;
router.setWss = (w) => { wss = w; };

const broadcast = (data) => {
  if (!wss) return;
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(JSON.stringify(data)); });
};

// Crear pedido
router.post('/', auth, async (req, res) => {
  const { mesa_id, mesa_numero, zona, items, comensales } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO pedidos (mesa_id, mesa_numero, zona, mesero_id, mesero_nombre, items, estado, comensales, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'pendiente',$7,NOW()) RETURNING *`,
      [mesa_id, mesa_numero, zona, req.user.id, req.user.nombre, JSON.stringify(items), comensales || 1]
    );
    const pedido = rows[0];
    await client.query("UPDATE mesas SET estado='ocupada' WHERE id=$1", [mesa_id]);
    await client.query('COMMIT');
    broadcast({ tipo: 'pedido_nuevo', pedido });
    res.json(pedido);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

// Listar pedidos activos
router.get('/activos', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM pedidos WHERE estado != 'pagado' ORDER BY created_at ASC"
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Pedidos de una mesa
router.get('/mesa/:mesa_id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM pedidos WHERE mesa_id=$1 AND estado != 'pagado' ORDER BY created_at ASC",
      [req.params.mesa_id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Actualizar estado (cocina)
router.patch('/:id/estado', auth, async (req, res) => {
  try {
    const { estado } = req.body;
    const { rows } = await pool.query(
      'UPDATE pedidos SET estado=$1 WHERE id=$2 RETURNING *',
      [estado, req.params.id]
    );
    broadcast({ tipo: 'pedido_actualizado', pedido: rows[0] });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Agregar items a pedido existente
router.patch('/:id/items', auth, async (req, res) => {
  try {
    const { items } = req.body;
    const { rows: curr } = await pool.query('SELECT items FROM pedidos WHERE id=$1', [req.params.id]);
    const nuevos = [...(curr[0].items || []), ...items];
    const { rows } = await pool.query(
      'UPDATE pedidos SET items=$1 WHERE id=$2 RETURNING *',
      [JSON.stringify(nuevos), req.params.id]
    );
    broadcast({ tipo: 'pedido_actualizado', pedido: rows[0] });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Marcar como entregado y descontar inventario
router.patch('/:id/entregar', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      "UPDATE pedidos SET estado='entregado', cerrado_en=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    const pedido = rows[0];
    // Descontar inventario por cada item
    const PORCIONES = { Carne:115, Pechuga:125, Cerdo:115, Costillas:150, Mojarra:275, Trucha:170 };
    for (const item of (pedido.items || [])) {
      const proteina = item.proteina;
      const gramos = PORCIONES[proteina];
      if (proteina && gramos) {
        await client.query(
          `UPDATE inventario SET stock_actual = stock_actual - $1 WHERE nombre=$2 AND stock_actual >= $1`,
          [gramos, proteina]
        );
        await client.query(
          `INSERT INTO movimientos_inventario (insumo_nombre, tipo, cantidad_g, motivo, referencia_pedido_id, created_at)
           VALUES ($1,'salida',$2,'venta',$3,NOW())`,
          [proteina, gramos, pedido.id]
        );
      }
    }
    await client.query('COMMIT');
    // Guardar en turnos para el modelo predictivo
    await pool.query(
      `INSERT INTO turnos (mesa_numero, zona, mesero_id, mesero_nombre, items, total, abierto_en, cerrado_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT DO NOTHING`,
      [pedido.mesa_numero, pedido.zona, pedido.mesero_id, pedido.mesero_nombre,
       JSON.stringify(pedido.items), pedido.total || 0, pedido.created_at]
    );
    broadcast({ tipo: 'pedido_entregado', pedido });
    res.json(pedido);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

// Marcar mesa como pagada
router.patch('/:id/pagar', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      "UPDATE pedidos SET estado='pagado' WHERE id=$1 RETURNING *", [req.params.id]
    );
    // Verificar si hay más pedidos activos en esa mesa
    const { rows: activos } = await client.query(
      "SELECT id FROM pedidos WHERE mesa_id=$1 AND estado NOT IN ('pagado')",
      [rows[0].mesa_id]
    );
    if (!activos.length) {
      await client.query("UPDATE mesas SET estado='libre' WHERE id=$1", [rows[0].mesa_id]);
    }
    await client.query('COMMIT');
    broadcast({ tipo: 'mesa_pagada', pedido: rows[0] });
    res.json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

// Anular item
router.patch('/:id/anular-item', auth, async (req, res) => {
  try {
    const { item_index, motivo } = req.body;
    const { rows: curr } = await pool.query('SELECT items FROM pedidos WHERE id=$1', [req.params.id]);
    const items = curr[0].items || [];
    items[item_index] = { ...items[item_index], anulado: true, motivo_anulacion: motivo };
    const { rows } = await pool.query('UPDATE pedidos SET items=$1 WHERE id=$2 RETURNING *', [JSON.stringify(items), req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
