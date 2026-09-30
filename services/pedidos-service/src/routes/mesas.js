const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM mesas ORDER BY numero');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/estado', auth, async (req, res) => {
  try {
    const { estado } = req.body;
    const { rows } = await pool.query('UPDATE mesas SET estado=$1 WHERE id=$2 RETURNING *', [estado, req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
