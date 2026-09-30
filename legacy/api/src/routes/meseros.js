const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id,nombre,usuario,rol,activo FROM meseros ORDER BY nombre');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  const { nombre, usuario, password, rol } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO meseros (nombre,usuario,password_hash,rol,activo) VALUES ($1,$2,$3,$4,true) RETURNING id,nombre,usuario,rol,activo',
      [nombre, usuario, hash, rol || 'mesero']
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { nombre, usuario, password, activo, rol } = req.body;
  try {
    let q, p;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      q = 'UPDATE meseros SET nombre=$1,usuario=$2,password_hash=$3,activo=$4,rol=$5 WHERE id=$6 RETURNING id,nombre,usuario,rol,activo';
      p = [nombre, usuario, hash, activo, rol || 'mesero', req.params.id];
    } else {
      q = 'UPDATE meseros SET nombre=$1,usuario=$2,activo=$3,rol=$4 WHERE id=$5 RETURNING id,nombre,usuario,rol,activo';
      p = [nombre, usuario, activo, rol || 'mesero', req.params.id];
    }
    const { rows } = await pool.query(q, p);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('UPDATE meseros SET activo=false WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
