const router = require('express').Router();
const auth = require('../middleware/auth');

const PRED_URL = process.env.PRED_URL || 'http://localhost:8000';

router.get('/predecir', auth, async (req, res) => {
  try {
    const { fecha } = req.query;
    const r = await fetch(`${PRED_URL}/predecir?fecha=${fecha || ''}`);
    const data = await r.json();
    res.json(data);
  } catch (e) { res.status(503).json({ error: 'Servicio de predicción no disponible' }); }
});

router.get('/comparacion', auth, async (req, res) => {
  try {
    const { fecha } = req.query;
    const r = await fetch(`${PRED_URL}/comparacion?fecha=${fecha || ''}`);
    const data = await r.json();
    res.json(data);
  } catch (e) { res.status(503).json({ error: 'Servicio de predicción no disponible' }); }
});

router.get('/recomendacion-neta', auth, async (req, res) => {
  try {
    const { fecha } = req.query;
    const r = await fetch(`${PRED_URL}/recomendacion-neta?fecha=${fecha || ''}`);
    const data = await r.json();
    res.json(data);
  } catch (e) { res.status(503).json({ error: 'Servicio de predicción no disponible' }); }
});

module.exports = router;
