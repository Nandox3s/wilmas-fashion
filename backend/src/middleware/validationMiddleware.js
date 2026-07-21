export const requireJson = (req, res, next) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Content-Type application/json is required', code: 'UNSUPPORTED_MEDIA_TYPE' })
  next()
}
