export const CART_STORAGE_KEY = 'wf_cart'

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}
export function parseSizes(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((size) => String(size).trim()).filter(Boolean))]
  }

  if (typeof value !== 'string' || !value.trim()) return []

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parseSizes(parsed)
  } catch {
    // Some existing records store sizes as a comma-separated string.
  }

  return parseSizes(value.split(','))
}

export function createLineId(productId, size = '', color = '') {
  return [productId, size || '-', color || '-']
    .map((part) => encodeURIComponent(String(part).trim().toLowerCase()))
    .join('::')
}

export function normalizeCartItem(item) {
  if (!item || typeof item !== 'object') return null

  const productId = item.productId ?? item.id
  if (productId === undefined || productId === null || !String(productId).trim()) return null

  const stock = Math.max(0, Math.floor(toFiniteNumber(item.stock, 0)))
  if (stock === 0) return null

  const size = String(item.size ?? item.selectedSize ?? '').trim()
  const color = String(item.color ?? item.selectedColor ?? '').trim()
  const quantity = Math.min(
    stock,
    Math.max(1, Math.floor(toFiniteNumber(item.quantity ?? item.qty, 1)))
  )

  const apiIdValue = item.apiId ?? (typeof productId === 'number' ? productId : null)
  const apiId = Number.isInteger(Number(apiIdValue)) ? Number(apiIdValue) : null

  return {
    lineId: createLineId(productId, size, color),
    productId,
    apiId,
    sku: String(item.sku ?? productId),
    name: String(item.name || 'Producto'),
    brand: String(item.brand || 'Wilmas Fashion'),
    category: String(item.category || ''),
    image: item.image || '',
    file: item.file || '',
    color,
    size,
    price: Math.max(0, toFiniteNumber(item.price, 0)),
    discount: Math.min(100, Math.max(0, toFiniteNumber(item.discount, 0))),
    stock,
    quantity,
  }
}

export function createCartItem(product, options = {}) {
  const size = String(options.size ?? options.selectedSize ?? '').trim()
  const color = String(options.color ?? options.selectedColor ?? product?.color ?? '').trim()

  return normalizeCartItem({
    ...product,
    productId: product?.id,
    apiId: product?.apiId,
    size,
    color,
    quantity: options.quantity ?? 1,
  })
}

export function addCartItem(items, product, options = {}) {
  const nextItem = createCartItem(product, options)
  if (!nextItem) return items

  const existing = items.find((item) => item.lineId === nextItem.lineId)
  if (!existing) return [...items, nextItem]

  return items.map((item) => (
    item.lineId === nextItem.lineId
      ? {
          ...item,
          ...nextItem,
          quantity: Math.min(nextItem.stock, item.quantity + nextItem.quantity),
        }
      : item
  ))
}

export function setCartItemQuantity(items, lineId, quantity) {
  return items.map((item) => {
    if (item.lineId !== lineId) return item
    const nextQuantity = Math.min(
      item.stock,
      Math.max(1, Math.floor(toFiniteNumber(quantity, item.quantity)))
    )
    return { ...item, quantity: nextQuantity }
  })
}

export function calculateCartPricing(items) {
  const merchandiseSubtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const discountTotal = items.reduce(
    (sum, item) => sum + item.price * (item.discount / 100) * item.quantity,
    0
  )
  const subtotal = Math.max(0, merchandiseSubtotal - discountTotal)
  const standardShipping = items.length === 0 || subtotal >= 80 ? 0 : 5.9

  return {
    merchandiseSubtotal,
    discountTotal,
    subtotal,
    standardShipping,
    total: subtotal + standardShipping,
  }
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(toFiniteNumber(value, 0))
}
