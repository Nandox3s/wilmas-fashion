export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, error: 'No tienes permisos para realizar esta acción.', message: 'No tienes permisos para realizar esta acción.', code: 'FORBIDDEN', requestId: req.requestId })
  next()
}
