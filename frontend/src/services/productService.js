import axios from 'axios'
import { parseSizes } from '../utils/cart'

function privateConfig(extra = {}) {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('Debes iniciar sesión para realizar esta acción.')
  return { ...extra, headers: { ...extra.headers, Authorization: `Bearer ${token}` } }
}

export async function getProducts(params = {}) {
  const response = await axios.get('/api/products', { params })
  return response.data
}
export async function getProductById(id) { return (await axios.get(`/api/products/${id}`)).data }
export async function createProduct(data) { return (await axios.post('/api/products', data, privateConfig())).data }
export async function updateProduct(id, data) { return (await axios.put(`/api/products/${id}`, data, privateConfig())).data }
export async function updateProductPrice(id, data) { return (await axios.patch(`/api/products/${id}/price`, data, privateConfig())).data }
export async function updateProductStock(id, data) { return (await axios.patch(`/api/products/${id}/stock`, data, privateConfig())).data }
export async function deleteProduct(id) { return (await axios.delete(`/api/products/${id}`, privateConfig())).data }
export async function uploadProductImage(file) {
  const body = new FormData()
  body.append('file', file)
  return (await axios.post('/api/upload', body, privateConfig())).data
}

function normalizeText(value) {
  return String(value || '').trim()
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

export async function loadCatalogProducts() {
  try {
    const response = await axios.get('/api/products', {
      params: { limit: 100 },
      skipGlobalErrorToast: true,
    })
    const apiProducts = (response.data?.items || []).map(normalizeApiProduct)
    return {
      products: apiProducts,
      source: 'api',
    }
  } catch {
    return { products: [], source: 'unavailable' }
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
