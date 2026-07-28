import { logger } from '../config/logger.js'

export function notFoundMiddleware(req, res) {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' })
}

export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err)
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'Invalid JSON', code: 'INVALID_JSON' })
  if (err.code === 'P2002') return res.status(409).json({ error: 'A unique value is already registered', code: 'CONFLICT' })
  if (err.code === 'P2025') return res.status(404).json({ error: 'Resource not found', code: 'NOT_FOUND' })
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must not exceed 5 MB', code: 'INVALID_FILE' })
  const status = Number.isInteger(err.status) ? err.status : 500
  if (status >= 500) logger.error('request_failed', { method: req.method, path: req.path, errorType: err.name, errorCode: err.code || 'UNEXPECTED' })
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message, ...(err.code && status < 500 ? { code: err.code } : {}) })
}
