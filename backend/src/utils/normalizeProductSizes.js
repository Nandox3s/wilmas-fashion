const MAX_SIZES = 12
const MAX_SIZE_LENGTH = 30

class SizesValidationError extends Error {}

function normalizeSingleSize(value, index) {
  if (typeof value !== 'string') {
    throw new SizesValidationError(`Invalid product size at index ${index}`)
  }
  const normalized = value.trim()
  if (!normalized) throw new SizesValidationError(`Invalid product size at index ${index}`)
  if (normalized.length > MAX_SIZE_LENGTH) throw new SizesValidationError(`Product size at index ${index} exceeds ${MAX_SIZE_LENGTH} characters`)
  return normalized
}

export function normalizeProductSizes(value) {
  if (value === null || value === undefined) return []

  let sizes = value

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) throw new SizesValidationError('Product sizes cannot be empty')

    let parsed
    let parseError = null
    try {
      parsed = JSON.parse(trimmed)
    } catch (err) {
      parseError = err
    }

    if (parseError === null) {
      // Valid JSON — must be an array
      if (!Array.isArray(parsed)) {
        throw new SizesValidationError('Product sizes JSON must be an array')
      }
      sizes = parsed
    } else {
      // Not valid JSON — try comma-separated fallback
      if (trimmed.includes(',')) {
        sizes = trimmed.split(',').map((s) => s.trim())
      } else {
        throw new SizesValidationError('Product sizes must be an array or a JSON array string')
      }
    }
  }

  if (!Array.isArray(sizes)) {
    throw new SizesValidationError('Invalid product sizes format')
  }

  if (sizes.length > MAX_SIZES) {
    throw new SizesValidationError(`Product sizes cannot exceed ${MAX_SIZES} entries`)
  }

  const normalized = sizes.map(normalizeSingleSize)
  return [...new Set(normalized)]
}

export function assertRequestedSize(size, availableSizes = [], { sku } = {}) {
  const normalizedSizes = normalizeProductSizes(availableSizes)
  const requested = typeof size === 'string' ? size.trim() : ''

  if (!requested) {
    if (normalizedSizes.length > 0) {
      throw new SizesValidationError(`Size is required for product SKU ${sku || 'unknown'}`)
    }
    return ''
  }

  if (requested.length > MAX_SIZE_LENGTH) {
    throw new SizesValidationError(`Requested size exceeds ${MAX_SIZE_LENGTH} characters`)
  }

  if (normalizedSizes.length > 0 && !normalizedSizes.includes(requested)) {
    throw new SizesValidationError(`Invalid size '${requested}' for SKU ${sku || 'unknown'}`)
  }

  return requested
}
