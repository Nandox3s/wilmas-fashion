import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export const authenticateToken = (prisma) => async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' })
    const decoded = jwt.verify(header.slice(7), env.jwtSecret)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) return res.status(401).json({ error: 'Session user no longer exists', code: 'INVALID_SESSION' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_SESSION' })
  }
}
