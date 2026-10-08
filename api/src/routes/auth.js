const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM meseros WHERE usuario=$1 AND activo=true', [usuario]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });
    const u = rows[0];
    // Admin y caja usan clave fija
    if (u.rol === 'admin') {
      if (password !== process.env.CLAVE_ADMIN) return res.status(401).json({ error: 'Credenciales inválidas' });
    } else if (u.rol === 'caja') {
      if (password !== process.env.CLAVE_CAJA) return res.status(401).json({ error: 'Credenciales inválidas' });
    } else {
      const ok = await bcrypt.compare(password, u.password_hash);
      if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ id: u.id, rol: u.rol, nombre: u.nombre }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, rol: u.rol, nombre: u.nombre });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
