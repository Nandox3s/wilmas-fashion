import axios from 'axios'
import { availableProducts } from '../data/products'
import { parseSizes } from '../utils/cart'

function normalizeText(value) {
  return String(value || '').trim()
}
function normalizeLocalProduct(product) {
  return {
    ...product,
    id: String(product.id),
    apiId: Number.isInteger(Number(product.apiId)) ? Number(product.apiId) : null,
    sku: normalizeText(product.sku || product.id).toUpperCase(),
    brand: normalizeText(product.brand || 'Wilmas Fashion'),
    sizes: parseSizes(product.sizes ?? product.size),
    price: Number(product.price) || 0,
    discount: Number(product.discount) || 0,
    stock: Math.max(0, Number(product.stock) || 0),
    source: product.apiId ? 'synced' : 'local',
  }
}

function normalizeApiProduct(product) {
  return {
    ...product,
    id: String(product.id),
    apiId: Number(product.id),
    sku: normalizeText(product.sku || product.id).toUpperCase(),
    brand: normalizeText(product.brand || 'Wilmas Fashion'),
    sizes: parseSizes(product.sizes ?? product.size),
    price: Number(product.price) || 0,
    discount: Number(product.discount) || 0,
    stock: Math.max(0, Number(product.stock) || 0),
    source: 'api',
  }
}

export function getLocalProducts() {
  return availableProducts.map(normalizeLocalProduct)
}

export async function loadCatalogProducts() {
  const localProducts = getLocalProducts()

  try {
    const response = await axios.get('/api/products', {
      params: { limit: 100 },
      skipGlobalErrorToast: true,
    })
    const apiProducts = (response.data?.items || []).map(normalizeApiProduct)
    const usedApiIds = new Set()

    const mergedLocal = localProducts.map((local) => {
      const match = apiProducts.find((api) => (
        api.sku === local.sku ||
        (
          api.name.toLocaleLowerCase() === local.name.toLocaleLowerCase() &&
          api.color.toLocaleLowerCase() === local.color.toLocaleLowerCase()
        )
      ))

      if (!match) return local
      usedApiIds.add(match.apiId)

      return {
        ...local,
        apiId: match.apiId,
        sku: match.sku,
        price: match.price,
        discount: match.discount,
        stock: match.stock,
        sizes: match.sizes.length ? match.sizes : local.sizes,
        source: 'synced',
      }
    })

    const apiOnly = apiProducts.filter((product) => !usedApiIds.has(product.apiId))
    return {
      products: [...mergedLocal, ...apiOnly],
      source: 'api',
    }
  } catch {
    return { products: localProducts, source: 'local' }
  }
}

export function groupProductFamilies(products) {
  const families = new Map()

  products.forEach((product) => {
    const key = [product.brand, product.name, product.category]
      .map((part) => normalizeText(part).toLocaleLowerCase())
      .join('::')
    const family = families.get(key)

    if (family) {
      family.variants.push(product)
      family.stock += product.stock
      family.minPrice = Math.min(family.minPrice, product.price)
      family.maxPrice = Math.max(family.maxPrice, product.price)
      family.onOffer = family.onOffer || Boolean(product.onOffer || product.discount)
    } else {
      families.set(key, {
        key,
        product,
        variants: [product],
        stock: product.stock,
        minPrice: product.price,
        maxPrice: product.price,
        onOffer: Boolean(product.onOffer || product.discount),
      })
    }
  })

  return [...families.values()].sort((a, b) => a.product.name.localeCompare(b.product.name, 'es'))
}

export function findProductFamily(products, productId) {
  const selected = products.find((product) => String(product.id) === String(productId))
  if (!selected) return null

  return groupProductFamilies(products).find((family) => (
    family.variants.some((variant) => String(variant.id) === String(productId))
  )) || null
}
