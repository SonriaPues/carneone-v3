const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const internal = require('../middleware/internal');

const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:4003';
const INVENTARIO_URL = process.env.INVENTARIO_URL || 'http://localhost:4002';
const INTERNAL_KEY = process.env.INTERNAL_KEY;

const PORCIONES = { Carne: 115, Pechuga: 125, Cerdo: 115, Costillas: 150, Mojarra: 275, Trucha: 170 };

// Total del pedido: suma de los precios de los ítems no anulados.
const totalDe = (items) => (items || [])
  .filter(i => !i.anulado)
  .reduce((s, i) => s + (Number(i.precio) || 0), 0);

let wss = null;
router.setWss = (w) => { wss = w; };

const broadcast = (data) => {
  if (!wss) return;
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(JSON.stringify(data)); });
};

// Crear pedido. Valida proteína/plato contra el menú vigente consultando al
// Servicio de Panel Administrativo por REST (numeral 3.2/3.3), en vez de leer
// su base de datos directamente.
router.post('/', auth, async (req, res) => {
  const { mesa_id, mesa_numero, zona, items, comensales } = req.body;
  try {
    const r = await fetch(`${ADMIN_URL}/internal/vigente`, { headers: { 'x-internal-key': INTERNAL_KEY } });
    if (r.ok) {
      const menu = await r.json();
      const proteinasHabilitadas = Object.entries(menu.proteinas || {}).filter(([, v]) => v).map(([k]) => k);
      const invalidos = (items || []).filter(it => proteinasHabilitadas.length && !proteinasHabilitadas.includes(it.proteina));
      if (invalidos.length) {
        return res.status(409).json({ error: `Proteína no disponible en el menú: ${invalidos.map(i => i.proteina).join(', ')}` });
      }
    }
    // Si el Servicio de Panel Administrativo no responde, se continúa sin bloquear
    // la toma del pedido: la disponibilidad de mesa/cocina es más crítica para la
    // operación que la validación de menú (RNF de disponibilidad, numeral 1.5.1).
  } catch { /* admin-service no disponible: continuar sin bloquear */ }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO pedidos (mesa_id, mesa_numero, zona, mesero_id, mesero_nombre, items, estado, comensales, total, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'pendiente',$7,$8,NOW()) RETURNING *`,
      [mesa_id, mesa_numero, zona, req.user.id, req.user.nombre, JSON.stringify(items), comensales || 1, totalDe(items)]
    );
    const pedido = rows[0];
    await client.query("UPDATE mesas SET estado='ocupada' WHERE id=$1", [mesa_id]);
    await client.query('COMMIT');
    broadcast({ tipo: 'pedido_nuevo', pedido });
    res.json(pedido);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.get('/activos', auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM pedidos WHERE estado != 'pagado' ORDER BY created_at ASC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/mesa/:mesa_id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM pedidos WHERE mesa_id=$1 AND estado != 'pagado' ORDER BY created_at ASC",
      [req.params.mesa_id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/estado', auth, async (req, res) => {
  try {
    const { estado } = req.body;
    const { rows } = await pool.query('UPDATE pedidos SET estado=$1 WHERE id=$2 RETURNING *', [estado, req.params.id]);
    broadcast({ tipo: 'pedido_actualizado', pedido: rows[0] });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/items', auth, async (req, res) => {
  try {
    const { items } = req.body;
    const { rows: curr } = await pool.query('SELECT items FROM pedidos WHERE id=$1', [req.params.id]);
    const nuevos = [...(curr[0].items || []), ...items];
    const { rows } = await pool.query('UPDATE pedidos SET items=$1, total=$2 WHERE id=$3 RETURNING *',
      [JSON.stringify(nuevos), totalDe(nuevos), req.params.id]);
    broadcast({ tipo: 'pedido_actualizado', pedido: rows[0] });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Marcar como entregado: descuenta inventario invocando al Servicio de
// Inventario por REST (numeral 3.2), nunca escribiendo directamente sobre su
// esquema `inventario`.
router.patch('/:id/entregar', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      "UPDATE pedidos SET estado='entregado', cerrado_en=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    const pedido = rows[0];

    const descuentos = [];
    for (const item of (pedido.items || [])) {
      const gramos = PORCIONES[item.proteina];
      if (item.proteina && gramos) descuentos.push({ proteina: item.proteina, gramos });
    }
    if (descuentos.length) {
      try {
        await fetch(`${INVENTARIO_URL}/internal/descontar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_KEY },
          body: JSON.stringify({ items: descuentos, pedido_id: pedido.id })
        });
      } catch { /* Servicio de Inventario no disponible: el pedido igual se marca entregado;
                   la reconciliación de inventario queda pendiente (numeral 3.6, monitoreo). */ }
    }

    await client.query('COMMIT');
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

router.patch('/:id/pagar', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query("UPDATE pedidos SET estado='pagado' WHERE id=$1 RETURNING *", [req.params.id]);
    const { rows: activos } = await client.query(
      "SELECT id FROM pedidos WHERE mesa_id=$1 AND estado NOT IN ('pagado')",
      [rows[0].mesa_id]
    );
    if (!activos.length) await client.query("UPDATE mesas SET estado='libre' WHERE id=$1", [rows[0].mesa_id]);
    await client.query('COMMIT');
    broadcast({ tipo: 'mesa_pagada', pedido: rows[0] });
    res.json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

router.patch('/:id/anular-item', auth, async (req, res) => {
  try {
    const { item_index, motivo } = req.body;
    const { rows: curr } = await pool.query('SELECT items FROM pedidos WHERE id=$1', [req.params.id]);
    const items = curr[0].items || [];
    items[item_index] = { ...items[item_index], anulado: true, motivo_anulacion: motivo };
    const { rows } = await pool.query('UPDATE pedidos SET items=$1, total=$2 WHERE id=$3 RETURNING *',
      [JSON.stringify(items), totalDe(items), req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Endpoint interno (numeral 3.2/3.3): consumido por admin-service
// (histórico) y por prediccion-service (dataset de entrenamiento), nunca por
// clientes finales.
router.get('/internal/turnos', internal, async (req, res) => {
  try {
    const { fecha, desde } = req.query;
    let rows;
    if (fecha) {
      ({ rows } = await pool.query(
        "SELECT * FROM turnos WHERE cerrado_en IS NOT NULL AND DATE(cerrado_en AT TIME ZONE 'America/Bogota')=$1",
        [fecha]
      ));
    } else if (desde) {
      ({ rows } = await pool.query(
        'SELECT * FROM turnos WHERE cerrado_en IS NOT NULL AND cerrado_en >= $1 ORDER BY cerrado_en ASC',
        [desde]
      ));
    } else {
      ({ rows } = await pool.query('SELECT * FROM turnos WHERE cerrado_en IS NOT NULL ORDER BY cerrado_en ASC'));
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
