// Autentica llamadas servicio-a-servicio (numeral 3.2/3.3: las referencias cruzadas se
// resuelven por REST síncrono al servicio propietario del dato, nunca por acceso directo
// a su base de datos). Cada microservicio comparte un secreto INTERNAL_KEY solo entre sí,
// nunca con los clientes finales.
module.exports = (req, res, next) => {
  const key = req.headers['x-internal-key'];
  if (!key || key !== process.env.INTERNAL_KEY) {
    return res.status(401).json({ error: 'Llamada interna no autorizada' });
  }
  next();
};
