// Autoriza por rol (después de `auth`): antes bastaba con tener sesión, y un mesero
// podía usar rutas del administrador. Responde 403 si el rol no está permitido.
module.exports = (...roles) => (req, res, next) => {
  if (roles.includes(req.user?.rol)) return next();
  res.status(403).json({ error: 'No autorizado para este rol' });
};
