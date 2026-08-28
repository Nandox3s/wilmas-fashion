import { HttpError } from '../utils/errors.js'
import { integer, money, normalizeSizes, serializeProduct, text } from '../utils/validation.js'

function dataFrom(input, partial = false) {
  const data = {}
  const assignText = (key, label) => { if (!partial || input[key] !== undefined) data[key] = text(input[key], label) }
  assignText('name', 'Name'); assignText('sku', 'SKU'); assignText('brand', 'Brand'); assignText('category', 'Category'); assignText('color', 'Color')
  if (data.sku) data.sku = data.sku.toUpperCase()
  if (!partial || input.price !== undefined) data.price = money(input.price, 'Price', { min: 0.01 }).toFixed(2)
  if (!partial || input.discount !== undefined) {
    const discount = money(input.discount ?? 0, 'Discount')
    if (discount > 100) throw new HttpError(400, 'Discount must be between 0 and 100')
    data.discount = discount.toFixed(2)
  }
  if (!partial || input.stock !== undefined) data.stock = integer(input.stock, 'Stock')
  if (!partial || input.sizes !== undefined || input.size !== undefined) {
    data.sizes = normalizeSizes(input.sizes ?? input.size)
    if (!data.sizes.length) throw new HttpError(400, 'At least one size is required')
  }
  if (!partial || input.onOffer !== undefined) data.onOffer = input.onOffer === true || input.onOffer === 'true'
  if (input.image !== undefined) data.image = typeof input.image === 'string' && input.image.trim() ? input.image.trim() : null
  return data
}

export class ProductService {
  constructor(prisma, storageService = null) { this.prisma = prisma; this.storageService = storageService }
  async serialize(product) {
    const output = serializeProduct(product)
    if (this.storageService && String(product.image || '').startsWith('products/')) output.image = await this.storageService.signedProduct(product.image)
    return output
  }
  async list(query, { includeInactive = false } = {}) {
    const page = Math.max(1, Number.parseInt(query.page) || 1); const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit) || 12))
    const where = includeInactive ? {} : { isActive: true }
    if (includeInactive && query.status === 'active') where.isActive = true
    if (includeInactive && query.status === 'hidden') where.isActive = false
    if (query.category) where.category = String(query.category).trim()
    if (query.onOffer === 'true') where.onOffer = true
    if (query.search) where.OR = ['name', 'sku', 'color'].map((key) => ({ [key]: { contains: String(query.search).trim(), mode: 'insensitive' } }))
    if (query.minPrice || query.maxPrice) where.price = { ...(query.minPrice ? { gte: money(query.minPrice, 'minPrice') } : {}), ...(query.maxPrice ? { lte: money(query.maxPrice, 'maxPrice') } : {}) }
    const [items, total] = await Promise.all([this.prisma.product.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.product.count({ where })])
    const filtered = query.size ? items.filter((item) => normalizeSizes(item.sizes).includes(String(query.size))) : items
    return { items: await Promise.all(filtered.map((item) => this.serialize(item))), total: query.size ? filtered.length : total, page, limit, pages: Math.ceil((query.size ? filtered.length : total) / limit) }
  }
  async get(id) { const product = await this.prisma.product.findFirst({ where: { id: integer(id, 'Product ID', { min: 1 }), isActive: true } }); if (!product) throw new HttpError(404, 'Producto no encontrado.', 'PRODUCT_NOT_FOUND'); return this.serialize(product) }
  async create(input, userId) { return this.serialize(await this.prisma.product.create({ data: { ...dataFrom(input), createdById: userId, updatedById: userId } })) }
  async update(id, input, userId) { return this.serialize(await this.prisma.product.update({ where: { id: integer(id, 'Product ID', { min: 1 }) }, data: { ...dataFrom(input, true), updatedById: userId } })) }
  async updateStatus(id, input, userId) {
    if (typeof input.isActive !== 'boolean') throw new HttpError(400, 'isActive must be a boolean', 'INVALID_PRODUCT_STATUS')
    return this.serialize(await this.prisma.product.update({ where: { id: integer(id, 'Product ID', { min: 1 }) }, data: { isActive: input.isActive, updatedById: userId } }))
  }
  async remove(id) {
    const productId = integer(id, 'Product ID', { min: 1 })
    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true } })
        if (!product) throw new HttpError(404, 'Producto no encontrado.', 'PRODUCT_NOT_FOUND')
        const [sales, orderItems, reservations] = await Promise.all([
          tx.sale.count({ where: { productId } }),
          tx.orderItem.count({ where: { productId } }),
          tx.inventoryReservation.count({ where: { productId } }),
        ])
        if (sales + orderItems + reservations > 0) {
          throw new HttpError(409, 'Este producto tiene pedidos o facturas asociados y no puede eliminarse. Puedes ocultarlo de la tienda.', 'PRODUCT_HAS_HISTORY')
        }
        await tx.product.delete({ where: { id: productId } })
        return { success: true, action: 'deleted' }
      }, { isolationLevel: 'Serializable' })
    } catch (error) {
      if (error.code === 'P2003') throw new HttpError(409, 'Este producto tiene historial asociado y no puede eliminarse. Puedes ocultarlo de la tienda.', 'PRODUCT_HAS_HISTORY')
      throw error
    }
  }
}
