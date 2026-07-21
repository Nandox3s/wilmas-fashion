import { createHash, randomUUID } from 'node:crypto'
import { env } from '../config/env.js'
import { HttpError } from '../utils/errors.js'
import { serializeMoney } from '../utils/validation.js'

const clean = (value) => JSON.parse(JSON.stringify(value, (key, item) => (/token|card|cvv|password|secret/i.test(key) ? undefined : item)))

export class PaymentService {
  constructor(prisma, provider, emailService, invoiceQueue = null) { this.prisma = prisma; this.provider = provider; this.emailService = emailService; this.invoiceQueue = invoiceQueue }
  async create({ orderReference, idempotencyKey, scenario }, user) {
    if (!idempotencyKey || String(idempotencyKey).length > 100) throw new HttpError(400, 'A valid idempotencyKey is required')
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: String(idempotencyKey) }, include: { order: true } })
    if (existing) {
      if (existing.order.userId !== user.id && user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
      return serializeMoney(existing)
    }
    const order = await this.prisma.order.findUnique({ where: { reference: String(orderReference) } })
    if (!order) throw new HttpError(404, 'Order not found')
    if (order.userId !== user.id && user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    if (order.status !== 'PENDING_PAYMENT') throw new HttpError(409, 'Order is not pending payment')
    if (order.expiresAt <= new Date()) throw new HttpError(409, 'Order has expired')
    const providerResult = await this.provider.createPayment({ order, scenario })
    return serializeMoney(await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({ data: { orderId: order.id, provider: providerResult.provider, providerTransactionId: providerResult.transactionId, clientTransactionId: providerResult.clientTransactionId, idempotencyKey: String(idempotencyKey), amount: order.total, currency: order.currency, status: 'PROCESSING', sanitizedResponse: clean(providerResult) } })
      await tx.order.update({ where: { id: order.id }, data: { status: 'PAYMENT_PROCESSING' } })
      return payment
    }))
  }
  async confirm({ paymentId, transactionId, scenario = 'approved', externalEventId }) {
    const payment = await this.prisma.payment.findUnique({ where: { id: Number(paymentId) }, include: { order: true } })
    if (!payment) throw new HttpError(404, 'Payment not found')
    if (payment.status === 'APPROVED' || payment.status === 'REJECTED') return serializeMoney(payment)
    if (payment.provider === 'mock' && transactionId && payment.providerTransactionId !== transactionId) throw new HttpError(400, 'Transaction does not match payment')
    const result = await this.provider.confirmPayment({ transactionId: payment.provider === 'payphone' ? transactionId : payment.providerTransactionId, clientTransactionId: payment.order.reference, scenario })
    const eventId = String(externalEventId || `${payment.provider}-${payment.providerTransactionId}-${result.status}`)
    const payload = clean(result); const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
    const updated = await this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.paymentEvent.findUnique({ where: { provider_externalEventId: { provider: payment.provider, externalEventId: eventId } } })
      if (duplicate) return tx.payment.findUnique({ where: { id: payment.id } })
      const approved = result.status === 'APPROVED'
      const row = await tx.payment.update({ where: { id: payment.id }, data: { status: approved ? 'APPROVED' : 'REJECTED', sanitizedResponse: payload } })
      await tx.paymentEvent.create({ data: { paymentId: payment.id, provider: payment.provider, eventType: result.status, externalEventId: eventId, payloadHash, payload } })
      await tx.order.update({ where: { id: payment.orderId }, data: approved ? { status: 'PAID', stockCommittedAt: new Date(), reservations: { updateMany: { where: { status: 'ACTIVE' }, data: { status: 'CONFIRMED' } } } } : { status: 'PAYMENT_FAILED', reservations: { updateMany: { where: { status: 'ACTIVE' }, data: { status: 'RELEASED' } } } } })
      if (!approved) {
        const reservations = await tx.inventoryReservation.findMany({ where: { orderId: payment.orderId, status: 'RELEASED' } })
        for (const reservation of reservations) await tx.product.update({ where: { id: reservation.productId }, data: { stock: { increment: reservation.quantity } } })
      } else {
        await tx.invoice.upsert({ where: { orderId: payment.orderId }, update: {}, create: { orderId: payment.orderId, provider: env.invoiceProvider, status: 'PENDING' } })
      }
      return row
    })
    await this.emailService.send({ to: payment.order.customerEmail, template: result.status === 'APPROVED' ? 'payment-approved' : 'payment-rejected', reference: payment.order.reference })
    if (result.status === 'APPROVED' && this.invoiceQueue) {
      const invoice = await this.prisma.invoice.findUnique({ where: { orderId: payment.orderId } })
      await this.invoiceQueue.send({ type: 'ISSUE_INVOICE', orderId: payment.orderId, invoiceId: invoice.id })
    }
    return serializeMoney(updated)
  }
  async get(id, user) {
    const payment = await this.prisma.payment.findUnique({ where: { id: Number(id) }, include: { order: true, events: true } })
    if (!payment) throw new HttpError(404, 'Payment not found')
    if (user.role !== 'ADMIN' && payment.order.userId !== user.id) throw new HttpError(403, 'Forbidden')
    return serializeMoney(payment)
  }
  async webhook(payload) {
    const verified = await this.provider.verifyCallback(payload)
    const payment = await this.prisma.payment.findFirst({ where: payload.clientTransactionId ? { clientTransactionId: String(payload.clientTransactionId) } : { providerTransactionId: String(payload.transactionId) } })
    if (!payment) throw new HttpError(404, 'Payment not found')
    return this.confirm({ paymentId: payment.id, transactionId: verified.transactionId || payload.transactionId, scenario: payload.scenario, externalEventId: verified.eventId })
  }
}
