import axios from 'axios'

export const API_TIMEOUT_MS = 15_000

const FRIENDLY_CODES = {
  INSUFFICIENT_STOCK: 'El stock de uno de los productos cambió. Revisa tu carrito.',
  FORBIDDEN: 'No tienes permisos para realizar esta acción.',
  INVALID_SESSION: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
  PRODUCT_HAS_HISTORY: 'Este producto tiene historial y no puede eliminarse. Puedes ocultarlo.',
  INVOICE_FILE_NOT_AVAILABLE: 'El archivo de la factura no está disponible.',
  PAYMENT_CANCELLED: 'El pago fue cancelado.',
  PAYMENT_ALREADY_CAPTURED: 'Este pago ya fue procesado.',
}

export function friendlyApiError(error, fallback = 'No se pudo completar la operación.') {
  const status = error?.response?.status
  const code = error?.response?.data?.code
  if (FRIENDLY_CODES[code]) return FRIENDLY_CODES[code]
  if (error?.code === 'ECONNABORTED' || /timeout/i.test(String(error?.message || ''))) return 'La solicitud tardó demasiado. Intenta nuevamente.'
  if (!error?.response) return 'No pudimos conectar con el servidor. Revisa tu conexión.'
  if (status === 403) return 'No tienes permisos para realizar esta acción.'
  if (status === 404) return error.response?.data?.message || 'El recurso solicitado no existe.'
  if (status === 429) return 'Has realizado demasiadas solicitudes. Espera un momento e intenta nuevamente.'
  if ([502, 503].includes(status)) return 'El servicio no está disponible temporalmente.'
  if (status >= 500) return 'Ocurrió un problema inesperado. Intenta nuevamente.'
  return error.response?.data?.message || error.response?.data?.error || fallback
}

export function authConfig(extra = {}) {
  const token = window.localStorage.getItem('token')
  if (!token) throw new Error('AUTH_REQUIRED')
  return { ...extra, headers: { ...extra.headers, Authorization: `Bearer ${token}` } }
}

export function clearSession() {
  ;['token', 'role', 'wf_user', 'user'].forEach((key) => window.localStorage.removeItem(key))
}

export function shouldClearSession(error, storedToken) {
  const authorization = error?.config?.headers?.Authorization || error?.config?.headers?.get?.('Authorization')
  return Boolean(
    storedToken &&
    error?.response?.status === 401 &&
    error?.response?.data?.code === 'INVALID_SESSION' &&
    /^Bearer\s+\S+$/i.test(String(authorization || ''))
  )
}

export function persistSession(data) {
  if (!data?.token) throw new Error('Missing authentication token')
  window.localStorage.setItem('token', data.token)
  window.localStorage.setItem('wf_user', JSON.stringify(data.user || {}))
  if (data.user?.role) window.localStorage.setItem('role', data.user.role)
  else window.localStorage.removeItem('role')
}

export function sessionPayload() {
  const token = window.localStorage.getItem('token')
  if (!token) return null
  try {
    const encoded = token.split('.')[1]
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')))
    if (payload.exp && payload.exp * 1000 <= Date.now()) { clearSession(); return null }
    return payload
  } catch { clearSession(); return null }
}

export async function refreshSession() {
  const response = await axios.get('/api/auth/me', authConfig())
  window.localStorage.setItem('wf_user', JSON.stringify(response.data.user))
  window.localStorage.setItem('role', response.data.user.role)
  return response.data.user
}
