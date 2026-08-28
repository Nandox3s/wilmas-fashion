import { randomUUID } from 'node:crypto'
import { logger } from '../config/logger.js'

const STATUS_CODES = {
  400: 'VALIDATION_ERROR', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND',
  409: 'CONFLICT', 422: 'VALIDATION_ERROR', 429: 'TOO_MANY_REQUESTS', 500: 'SERVER_ERROR',
  502: 'SERVICE_UNAVAILABLE', 503: 'SERVICE_UNAVAILABLE',
}

const PRISMA_ERRORS = {
  P2002: { status: 409, code: 'CONFLICT', message: 'Ya existe un registro con esos datos.' },
  P2003: { status: 409, code: 'RELATION_CONFLICT', message: 'El registro tiene información relacionada y no puede eliminarse.' },
  P2014: { status: 409, code: 'RELATION_CONFLICT', message: 'La operación afectaría información relacionada.' },
  P2025: { status: 404, code: 'NOT_FOUND', message: 'El recurso solicitado no existe.' },
  P2000: { status: 400, code: 'VALIDATION_ERROR', message: 'Uno de los valores supera el tamaño permitido.' },
  P2005: { status: 400, code: 'VALIDATION_ERROR', message: 'Uno de los valores no es válido.' },
  P2006: { status: 400, code: 'VALIDATION_ERROR', message: 'Uno de los valores no es válido.' },
  P2012: { status: 400, code: 'VALIDATION_ERROR', message: 'Falta un dato obligatorio.' },
}

function sendError(res, status, code, message, requestId) {
  return res.status(status).json({ success: false, code, message, error: message, requestId })
}

export function requestContextMiddleware(req, res, next) {
  const supplied = String(req.get('X-Request-ID') || '').trim()
  req.requestId = /^[a-zA-Z0-9._:-]{1,100}$/.test(supplied) ? supplied : randomUUID()
  res.set('X-Request-ID', req.requestId)
  next()
}

export function notFoundMiddleware(req, res) {
  sendError(res, 404, 'NOT_FOUND', 'La ruta solicitada no existe.', req.requestId)
}

export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err)
  if (err instanceof SyntaxError && 'body' in err) return sendError(res, 400, 'INVALID_JSON', 'El cuerpo JSON no es válido.', req.requestId)
  if (err.code === 'LIMIT_FILE_SIZE') return sendError(res, 400, 'INVALID_FILE', 'La imagen no puede superar 5 MB.', req.requestId)
  const prisma = PRISMA_ERRORS[err.code]
  if (prisma) return sendError(res, prisma.status, prisma.code, prisma.message, req.requestId)
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599 ? err.status : 500
  const code = status >= 500 ? 'SERVER_ERROR' : (err.code || STATUS_CODES[status] || 'REQUEST_ERROR')
  const message = status >= 500 ? 'Ocurrió un problema inesperado. Intenta nuevamente.' : (err.message || 'No se pudo completar la solicitud.')
  logger[status >= 500 ? 'error' : 'warn']('request_failed', {
    requestId: req.requestId, method: req.method, path: req.originalUrl || req.path,
    status, errorType: err.name, errorCode: code, userId: req.user?.id,
  })
  return sendError(res, status, code, message, req.requestId)
}
