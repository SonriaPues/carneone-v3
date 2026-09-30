const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM menu WHERE id=1');
    res.json(rows[0] || { proteinas:{}, platos:{} });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/', auth, async (req, res) => {
  try {
    const curr = await pool.query('SELECT * FROM menu WHERE id=1');
    const prev = curr.rows[0] || { proteinas:{}, platos:{} };
    const proteinas = { ...prev.proteinas, ...(req.body.proteinas||{}) };
    const platos = { ...prev.platos, ...(req.body.platos||{}) };
    await pool.query(
      'INSERT INTO menu (id,proteinas,platos) VALUES (1,$1,$2) ON CONFLICT (id) DO UPDATE SET proteinas=$1,platos=$2',
      [proteinas, platos]
    );
    res.json({ proteinas, platos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
