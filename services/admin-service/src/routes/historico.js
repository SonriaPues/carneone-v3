const router = require('express').Router();
const auth = require('../middleware/auth');
const rol = require('../middleware/rol');

const PEDIDOS_URL = process.env.PEDIDOS_URL || 'http://localhost:4001';
const INTERNAL_KEY = process.env.INTERNAL_KEY;
const PROTEINAS = ['Carne', 'Pechuga', 'Cerdo', 'Costillas', 'Mojarra', 'Trucha'];

const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const horaBogota = (ts) => Number(new Date(ts).toLocaleString('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false })) % 24;
const restarDias = (fecha, n) => {
  const d = new Date(fecha + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

// El panel administrativo no tiene los turnos en su propia base de datos
// (esquema `admin`): los consulta al Servicio de Pedidos, dueño de ese dato,
// mediante REST síncrono (numeral 3.2/3.3), en vez de leer su base directamente.
async function turnosDe(fecha) {
  const r = await fetch(`${PEDIDOS_URL}/internal/turnos?fecha=${fecha}`, {
    headers: { 'x-internal-key': INTERNAL_KEY }
  });
  if (!r.ok) throw new Error('Servicio de Pedidos no disponible');
  return r.json();
}

// Resume un día. "Platos" no incluye los adicionales.
function resumir(fecha, rows) {
  const conteoProteinas = Object.fromEntries(PROTEINAS.map(p => [p, 0]));
  const conteoPlatos = {};
  const porHora = {};
  const porMesero = {};
  const porMesa = {};
  const mesasSet = new Set();
  let totalDia = 0;
  let totalPlatos = 0;

  for (const t of rows) {
    const items = (Array.isArray(t.items) ? t.items : JSON.parse(t.items || '[]')).filter(i => !i.anulado);
    const platos = items.filter(i => !i.adicional);
    const total = t.total || 0;
    totalDia += total;
    totalPlatos += platos.length;
    mesasSet.add(t.mesa_numero);
    const h = horaBogota(t.abierto_en || t.cerrado_en);
    porHora[h] = (porHora[h] || 0) + platos.length;
    for (const it of platos) {
      if (it.proteina && PROTEINAS.includes(it.proteina)) conteoProteinas[it.proteina]++;
      if (it.plato) conteoPlatos[it.plato] = (conteoPlatos[it.plato] || 0) + 1;
    }
    const mn = t.mesero_nombre || 'Sin asignar';
    if (!porMesero[mn]) porMesero[mn] = { nombre: mn, turnos: [], total: 0, platos: 0 };
    porMesero[mn].turnos.push(t);
    porMesero[mn].total += total;
    porMesero[mn].platos += platos.length;
    if (!porMesa[t.mesa_numero]) porMesa[t.mesa_numero] = { mesa: t.mesa_numero, turnos: [], total: 0, platos: 0 };
    porMesa[t.mesa_numero].turnos.push(t);
    porMesa[t.mesa_numero].total += total;
    porMesa[t.mesa_numero].platos += platos.length;
  }

  return {
    fecha,
    totalDia,
    mesasAtendidas: rows.length, // cada turno es una mesa atendida
    mesasDistintas: mesasSet.size,
    totalPlatos,
    conteoProteinas,
    conteoPlatos,
    porHora: Object.entries(porHora).map(([hora, platos]) => ({ hora: Number(hora), platos })).sort((a, b) => a.hora - b.hora),
    porMesero: Object.values(porMesero).sort((a, b) => b.total - a.total),
    porMesa: Object.values(porMesa).sort((a, b) => a.mesa - b.mesa),
  };
}

router.get('/', auth, rol('admin'), async (req, res) => {
  try {
    const f = req.query.fecha || hoyBogota();
    const antes = restarDias(f, 7);
    const [hoy, previo] = await Promise.all([turnosDe(f), turnosDe(antes).catch(() => null)]);
    const r = resumir(f, hoy);
    const p = previo ? resumir(antes, previo) : null;
    res.json({
      ...r,
      // Mismo día de la semana anterior, para comparar.
      semanaAnterior: p && { fecha: p.fecha, totalDia: p.totalDia, mesasAtendidas: p.mesasAtendidas, totalPlatos: p.totalPlatos },
    });
  } catch (e) { res.status(503).json({ error: e.message }); }
});

module.exports = router;
