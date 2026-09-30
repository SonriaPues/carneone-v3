const router = require('express').Router();
const auth = require('../middleware/auth');

const PEDIDOS_URL = process.env.PEDIDOS_URL || 'http://localhost:4001';
const INTERNAL_KEY = process.env.INTERNAL_KEY;
const PROTEINAS = ['Carne', 'Pechuga', 'Cerdo', 'Costillas', 'Mojarra', 'Trucha'];

// El panel administrativo no tiene los turnos en su propia base de datos
// (esquema `admin`): los consulta al Servicio de Pedidos, dueño de ese dato,
// mediante REST síncrono (numeral 3.2/3.3), en vez de leer su base directamente.
router.get('/', auth, async (req, res) => {
  try {
    const { fecha } = req.query;
    const f = fecha || new Date().toISOString().split('T')[0];

    const r = await fetch(`${PEDIDOS_URL}/internal/turnos?fecha=${f}`, {
      headers: { 'x-internal-key': INTERNAL_KEY }
    });
    if (!r.ok) throw new Error('Servicio de Pedidos no disponible');
    const rows = await r.json();

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
  } catch (e) { res.status(503).json({ error: e.message }); }
});

module.exports = router;
