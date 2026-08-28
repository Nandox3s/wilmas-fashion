import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export const authenticateToken = (prisma) => async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Debes iniciar sesión.', message: 'Debes iniciar sesión.', code: 'AUTH_REQUIRED', requestId: req.requestId })
    const decoded = jwt.verify(header.slice(7), env.jwtSecret)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) return res.status(401).json({ success: false, error: 'Tu sesión ha expirado. Inicia sesión nuevamente.', message: 'Tu sesión ha expirado. Inicia sesión nuevamente.', code: 'INVALID_SESSION', requestId: req.requestId })
    req.user = user
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Tu sesión ha expirado. Inicia sesión nuevamente.', message: 'Tu sesión ha expirado. Inicia sesión nuevamente.', code: 'INVALID_SESSION', requestId: req.requestId })
  }
}
