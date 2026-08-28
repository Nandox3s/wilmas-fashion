import { randomBytes } from 'node:crypto'
import { env } from '../config/env.js'
import { HttpError } from '../utils/errors.js'
import { emailIsValid, integer, serializeMoney, text } from '../utils/validation.js'
import { assertRequestedSize, normalizeProductSizes } from '../utils/normalizeProductSizes.js'

const cents = (value) => Math.round((Number(value) + Number.EPSILON) * 100)
const amount = (value) => (value / 100).toFixed(2)
const reference = () => `WF-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`
const includeOrder = { items: true, payments: true, invoice: true }

export class OrderService {
  constructor(prisma) { this.prisma = prisma }
  async create(input, user) {
    if (!Array.isArray(input.items) || input.items.length === 0) throw new HttpError(400, 'El pedido debe incluir al menos un producto.', 'VALIDATION_ERROR')
    const paymentMethod = input.paymentMethod == null ? null : String(input.paymentMethod)
    if (paymentMethod && !['cash_on_delivery', 'paypal'].includes(paymentMethod)) throw new HttpError(400, 'El método de pago no es válido.', 'VALIDATION_ERROR')
    const customerEmail = String(input.customerEmail || user.email || '').trim().toLowerCase()
    if (!emailIsValid(customerEmail)) throw new HttpError(400, 'El correo electrónico no es válido.', 'VALIDATION_ERROR')
    const customer = {
      customerName: text(input.customerName || user.name, 'Customer name'), customerEmail,
      identificationType: text(input.identificationType, 'Identification type', 30), identificationNumber: text(input.identificationNumber, 'Identification number', 30),
      address: text(input.address, 'Address', 300), city: text(input.city, 'City', 100), phone: text(input.phone, 'Phone', 30),
    }
    const requested = new Map()
    for (const line of input.items) {
      const productId = integer(line.productId ?? line.apiId, 'Product ID', { min: 1 }); const quantity = integer(line.quantity, 'Quantity', { min: 1 })
      const size = text(String(line.size || ''), 'Size', 30); const color = text(String(line.color || ''), 'Color', 60)
      const key = `${productId}:${size}:${color}`; const current = requested.get(key)
      requested.set(key, { productId, quantity: (current?.quantity || 0) + quantity, size, color })
    }
    const expiresAt = new Date(Date.now() + env.orderExpirationMinutes * 60_000)
    return serializeMoney(await this.prisma.$transaction(async (tx) => {
      const productIds = [...new Set([...requested.values()].map((line) => line.productId))]
      const products = await tx.product.findMany({ where: { id: { in: productIds } } })
      for (const product of products) {
        try {
          product.sizes = normalizeProductSizes(product.sizes)
        } catch (err) {
          throw new HttpError(500, `Product ${product.id} has invalid sizes format`)
        }
      }
      if (products.length !== productIds.length) throw new HttpError(404, 'Uno o más productos no existen.', 'PRODUCT_NOT_FOUND')
      let subtotalCents = 0; let discountCents = 0; let taxCents = 0
      const lines = []
      for (const product of products) {
        const productLines = [...requested.values()].filter((line) => line.productId === product.id)
        const totalQuantity = productLines.reduce((sum, line) => sum + line.quantity, 0)
        const stock = await tx.product.updateMany({ where: { id: product.id, stock: { gte: totalQuantity } }, data: { stock: { decrement: totalQuantity } } })
        if (stock.count !== 1) throw new HttpError(409, 'El stock de uno de los productos cambió. Revisa tu carrito.', 'INSUFFICIENT_STOCK')
        for (const request of productLines) {
          request.size = assertRequestedSize(request.size, product.sizes, { sku: product.sku })
          const base = cents(product.price) * request.quantity
          const discount = product.onOffer ? Math.round(base * Number(product.discount) / 100) : 0
          const taxable = base - discount; const tax = Math.round(taxable * env.taxRate)
          subtotalCents += base; discountCents += discount; taxCents += tax
          lines.push({ productId: product.id, sku: product.sku, name: product.name, brand: product.brand, category: product.category, size: request.size, color: request.color, quantity: request.quantity, unitPrice: amount(cents(product.price)), discount: amount(discount), tax: amount(tax), total: amount(taxable + tax) })
        }
      }
      const shippingCents = subtotalCents - discountCents >= cents(env.freeShippingThreshold) ? 0 : cents(env.shippingAmount)
      const isCashOnDelivery = paymentMethod === 'cash_on_delivery'
      const orderReference = reference()
      const orderTotal = amount(subtotalCents - discountCents + taxCents + shippingCents)
      const reservations = [...new Set(lines.map((line) => line.productId))].map((productId) => ({ productId, quantity: lines.filter((line) => line.productId === productId).reduce((sum, line) => sum + line.quantity, 0), expiresAt, ...(isCashOnDelivery ? { status: 'CONFIRMED' } : {}) }))
      const created = await tx.order.create({ data: { reference: orderReference, userId: user.id, ...customer, subtotal: amount(subtotalCents), discount: amount(discountCents), tax: amount(taxCents), shipping: amount(shippingCents), total: orderTotal, expiresAt, ...(isCashOnDelivery ? { stockCommittedAt: new Date(), payments: { create: { provider: 'cash_on_delivery', idempotencyKey: `${orderReference}-cash-on-delivery`, amount: orderTotal, currency: 'USD', status: 'PENDING' } } } : {}), items: { create: lines }, reservations: { create: reservations } }, include: includeOrder })

      if (input.billingProfile && typeof input.billingProfile === 'object') {
        const legalName = text(input.billingProfile.legalName, 'Billing legal name', 120)
        const billingEmail = String(input.billingProfile.billingEmail || customerEmail).trim().toLowerCase()
        if (emailIsValid(billingEmail)) {
          await tx.billingProfile.create({
            data: {
              userId: user.id,
              identificationType: customer.identificationType,
              identificationNumber: customer.identificationNumber,
              legalName,
              billingEmail,
              phone: String(input.billingProfile.phone || customer.phone || '').trim() || null,
              billingAddress: text(input.billingProfile.billingAddress || customer.address, 'Billing address', 300),
              isDefault: false,
            },
          })
        }
      }

      return created
    }))
  }
  async byReference(referenceValue, user) {
    const order = await this.prisma.order.findUnique({ where: { reference: String(referenceValue) }, include: includeOrder })
    if (!order) throw new HttpError(404, 'Pedido no encontrado.', 'ORDER_NOT_FOUND')
    if (user.role !== 'ADMIN' && order.userId !== user.id) throw new HttpError(403, 'No tienes permisos para ver este pedido.', 'FORBIDDEN')
    return serializeMoney(order)
  }
  async mine(userId) { return serializeMoney(await this.prisma.order.findMany({ where: { userId }, include: includeOrder, orderBy: { createdAt: 'desc' } })) }
  async all() { return serializeMoney(await this.prisma.order.findMany({ include: { ...includeOrder, user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } })) }
}
