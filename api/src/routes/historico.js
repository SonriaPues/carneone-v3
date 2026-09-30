const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const PROTEINAS = ['Carne','Pechuga','Cerdo','Costillas','Mojarra','Trucha'];

router.get('/', auth, async (req, res) => {
  try {
    const { fecha } = req.query;
    const f = fecha || new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(
      `SELECT t.*, m.mesero_nombre FROM turnos t
       LEFT JOIN (SELECT mesero_nombre, mesa_numero FROM turnos) m ON m.mesa_numero = t.mesa_numero
       WHERE DATE(t.cerrado_en AT TIME ZONE 'America/Bogota') = $1`,
      [f]
    );
    const conteoProteinas = {};
    PROTEINAS.forEach(p => conteoProteinas[p] = 0);
    let totalDia = 0;
    const mesasSet = new Set();
    const porMesero = {};
    const porMesa = {};

    for (const t of rows) {
      totalDia += t.total || 0;
      mesasSet.add(t.mesa_numero);
      const items = Array.isArray(t.items) ? t.items : JSON.parse(t.items || '[]');
      for (const it of items) {
        if (it.proteina && PROTEINAS.includes(it.proteina)) conteoProteinas[it.proteina]++;
      }
      const mn = t.mesero_nombre || 'Sin asignar';
      if (!porMesero[mn]) porMesero[mn] = { nombre: mn, turnos: [], total: 0 };
      porMesero[mn].turnos.push(t);
      porMesero[mn].total += t.total || 0;
      if (!porMesa[t.mesa_numero]) porMesa[t.mesa_numero] = { mesa: t.mesa_numero, turnos: [], total: 0 };
      porMesa[t.mesa_numero].turnos.push(t);
      porMesa[t.mesa_numero].total += t.total || 0;
    }

    res.json({
      fecha: f,
      totalDia,
      mesasAtendidas: mesasSet.size,
      conteoProteinas,
      porMesero: Object.values(porMesero),
      porMesa: Object.values(porMesa)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
