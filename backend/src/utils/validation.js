import { HttpError } from './errors.js'

export const emailIsValid = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
export const text = (value, field, max = 200) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new HttpError(400, `${field} is required and must not exceed ${max} characters`)
  return value.trim()
}
export const integer = (value, field, { min = 0 } = {}) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < min) throw new HttpError(400, `${field} must be an integer greater than or equal to ${min}`)
  return parsed
}
export const money = (value, field, { min = 0 } = {}) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min) throw new HttpError(400, `${field} must be a valid amount`)
  return Math.round((parsed + Number.EPSILON) * 100) / 100
}
export const normalizeSizes = (value) => {
  let values = value
  if (typeof value === 'string') {
    try { values = JSON.parse(value) } catch { values = value.split(',') }
  }
  if (!Array.isArray(values)) values = []
  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))]
}
export const publicUser = ({ id, name, email, role, avatar, createdAt, updatedAt }) => ({ id, name, email, role, avatar: avatar || null, createdAt, updatedAt })
export const serializeProduct = (product) => product && ({ ...product, price: Number(product.price), discount: Number(product.discount), sizes: normalizeSizes(product.sizes) })
export const serializeMoney = (record) => record && JSON.parse(JSON.stringify(record, (key, value) => (
  value && typeof value === 'object' && typeof value.toFixed === 'function' ? Number(value) : value
)))
