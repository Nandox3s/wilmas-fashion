import axios from 'axios'

export function authConfig(extra = {}) {
  const token = window.localStorage.getItem('token')
  if (!token) throw new Error('AUTH_REQUIRED')
  return { ...extra, headers: { ...extra.headers, Authorization: `Bearer ${token}` } }
}

export function clearSession() {
  ;['token', 'role', 'wf_user', 'user'].forEach((key) => window.localStorage.removeItem(key))
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
