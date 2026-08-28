import { createHash, randomUUID } from 'node:crypto'
import { env } from '../config/env.js'
import { HttpError } from '../utils/errors.js'
import { serializeMoney } from '../utils/validation.js'
import { assertOrderTransition } from './orderStateMachine.js'

const clean = (value) => JSON.parse(JSON.stringify(value, (key, item) => (/token|card|cvv|password|secret/i.test(key) ? undefined : item)))
const money = (value) => Number(value).toFixed(2)

function paypalCaptureSummary(result, capture) {
  return {
    paypalOrderId: String(result.id),
    status: String(result.status),
    captureId: String(capture.id),
    captureStatus: String(capture.status),
    amount: String(capture.amount?.value),
    currency: String(capture.amount?.currency_code),
  }
}

export class PaymentService {
  constructor(prisma, provider, emailService, invoiceQueue = null, paypalProvider = null) { this.prisma = prisma; this.provider = provider; this.emailService = emailService; this.invoiceQueue = invoiceQueue; this.paypalProvider = paypalProvider }

  async preparePayphone({ orderId, scenario }, user) {
    const order = await this.prisma.order.findUnique({ where: { id: Number(orderId) } })
    if (!order) throw new HttpError(404, 'Order not found')
    if (order.userId !== user.id && user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    if (order.status !== 'PENDING_PAYMENT') throw new HttpError(409, 'Order is not pending payment')

    const idempotencyKey = `${order.reference}-prepare-${randomUUID()}`
    const payment = await this.create({ orderReference: order.reference, idempotencyKey, scenario }, user)

    return {
      payment,
      payphone: {
        provider: payment.provider,
        transactionId: payment.providerTransactionId,
        clientTransactionId: payment.clientTransactionId,
        redirectUrl: payment.sanitizedResponse?.redirectUrl || null,
        responseUrl: process.env.PAYPHONE_RESPONSE_URL || null,
        allowedDomain: process.env.PAYPHONE_ALLOWED_DOMAIN || null,
      },
    }
  }

  async confirmPayphone({ id, clientTransactionId, scenario }, user) {
    const payment = await this.prisma.payment.findUnique({ where: { id: Number(id) }, include: { order: true } })
    if (!payment) throw new HttpError(404, 'Payment not found')
    if (payment.order.userId !== user.id && user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    if (clientTransactionId && payment.clientTransactionId && String(clientTransactionId) !== String(payment.clientTransactionId)) {
      throw new HttpError(409, 'clientTransactionId does not match payment')
    }
    return this.confirm({ paymentId: payment.id, transactionId: payment.providerTransactionId, scenario, externalEventId: `payphone-confirm-${payment.id}-${payment.providerTransactionId}` })
  }

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
      assertOrderTransition(order.status, 'PAYMENT_PROCESSING')
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
      const nextOrderStatus = approved ? 'PAID' : 'PAYMENT_FAILED'
      assertOrderTransition(payment.order.status, nextOrderStatus)
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

  async createPaypalOrder({ orderId }, user) {
    if (!this.paypalProvider) throw new HttpError(503, 'PayPal Sandbox is not configured', 'PAYPAL_NOT_CONFIGURED')
    const localOrderId = Number(orderId)
    if (!Number.isInteger(localOrderId) || localOrderId <= 0) throw new HttpError(400, 'A valid orderId is required')
    const idempotencyKey = `paypal-create-${localOrderId}`
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey }, include: { order: true } })
    if (existing) {
      if (existing.order.userId !== user.id && user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
      if (existing.provider !== 'paypal') throw new HttpError(409, 'Payment provider conflict')
      return { paypalOrderId: existing.providerTransactionId, orderId: existing.orderId, status: existing.status }
    }

    const order = await this.prisma.order.findUnique({ where: { id: localOrderId } })
    if (!order) throw new HttpError(404, 'Order not found')
    if (order.userId !== user.id && user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    if (order.status !== 'PENDING_PAYMENT') throw new HttpError(409, 'Order is not pending payment')
    if (order.expiresAt <= new Date()) throw new HttpError(409, 'Order has expired')
    if (order.currency !== 'USD') throw new HttpError(409, 'PayPal Sandbox requires USD')

    const paypalOrder = await this.paypalProvider.createOrder({ order, requestId: idempotencyKey })
    if (!paypalOrder?.id || !['CREATED', 'PAYER_ACTION_REQUIRED'].includes(paypalOrder.status)) {
      throw new HttpError(502, 'PayPal returned an invalid order', 'PAYPAL_INVALID_ORDER')
    }

    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const row = await tx.payment.create({ data: {
          orderId: order.id,
          provider: 'paypal',
          providerTransactionId: String(paypalOrder.id),
          clientTransactionId: `paypal:${order.reference}`,
          idempotencyKey,
          amount: order.total,
          currency: order.currency,
          status: 'PROCESSING',
          sanitizedResponse: { paypalOrderId: String(paypalOrder.id), status: String(paypalOrder.status) },
        } })
        assertOrderTransition(order.status, 'PAYMENT_PROCESSING')
        await tx.order.update({ where: { id: order.id }, data: { status: 'PAYMENT_PROCESSING' } })
        return row
      })
      return { paypalOrderId: payment.providerTransactionId, orderId: payment.orderId, status: payment.status }
    } catch (error) {
      if (error?.code !== 'P2002') throw error
      const payment = await this.prisma.payment.findUnique({ where: { idempotencyKey }, include: { order: true } })
      if (!payment || (payment.order.userId !== user.id && user.role !== 'ADMIN')) throw error
      return { paypalOrderId: payment.providerTransactionId, orderId: payment.orderId, status: payment.status }
    }
  }

  async capturePaypalOrder({ paypalOrderId, orderId }, user) {
    if (!this.paypalProvider) throw new HttpError(503, 'PayPal Sandbox is not configured', 'PAYPAL_NOT_CONFIGURED')
    const localOrderId = Number(orderId)
    const providerOrderId = String(paypalOrderId || '').trim()
    if (!Number.isInteger(localOrderId) || localOrderId <= 0 || !providerOrderId || providerOrderId.length > 64) {
      throw new HttpError(400, 'Valid paypalOrderId and orderId are required')
    }
    const payment = await this.prisma.payment.findFirst({ where: { orderId: localOrderId, provider: 'paypal', providerTransactionId: providerOrderId }, include: { order: true } })
    if (!payment) throw new HttpError(404, 'PayPal payment not found')
    if (payment.order.userId !== user.id && user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    if (payment.status === 'APPROVED' || payment.order.status === 'PAID') throw new HttpError(409, 'PayPal order was already captured', 'PAYPAL_ALREADY_CAPTURED')
    if (payment.status !== 'PROCESSING' || payment.order.status !== 'PAYMENT_PROCESSING') throw new HttpError(409, 'PayPal payment cannot be captured')

    const result = await this.paypalProvider.captureOrder({ paypalOrderId: providerOrderId, requestId: `paypal-capture-${payment.id}` })
    const unit = result?.purchase_units?.find((item) => String(item.reference_id) === String(localOrderId))
    const capture = unit?.payments?.captures?.find((item) => item.status === 'COMPLETED')
    if (String(result?.id) !== providerOrderId || result?.status !== 'COMPLETED' || !capture) {
      throw new HttpError(409, 'PayPal payment is not completed', 'PAYPAL_NOT_COMPLETED')
    }
    if (String(unit.custom_id) !== payment.order.reference) throw new HttpError(409, 'PayPal order reference does not match', 'PAYPAL_REFERENCE_MISMATCH')
    if (capture.amount?.currency_code !== payment.currency || payment.currency !== 'USD' || money(capture.amount?.value) !== money(payment.amount) || money(payment.order.total) !== money(payment.amount)) {
      throw new HttpError(409, 'PayPal payment amount does not match the local order', 'PAYPAL_AMOUNT_MISMATCH')
    }

    const payload = paypalCaptureSummary(result, capture)
    const eventId = `paypal-capture-${capture.id}`
    const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
    let finalized = false
    const updated = await this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.paymentEvent.findUnique({ where: { provider_externalEventId: { provider: 'paypal', externalEventId: eventId } } })
      if (duplicate) return tx.payment.findUnique({ where: { id: payment.id } })
      const changed = await tx.payment.updateMany({ where: { id: payment.id, status: 'PROCESSING' }, data: { status: 'APPROVED', externalTransactionId: String(capture.id), confirmedAt: new Date(), sanitizedResponse: payload } })
      if (changed.count !== 1) return tx.payment.findUnique({ where: { id: payment.id } })
      await tx.paymentEvent.create({ data: { paymentId: payment.id, provider: 'paypal', eventType: 'COMPLETED', externalEventId: eventId, payloadHash, payload } })
      assertOrderTransition(payment.order.status, 'PAID')
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'PAID', stockCommittedAt: new Date(), reservations: { updateMany: { where: { status: 'ACTIVE' }, data: { status: 'CONFIRMED' } } } } })
      finalized = true
      return tx.payment.findUnique({ where: { id: payment.id } })
    })
    if (finalized) await this.emailService.send({ to: payment.order.customerEmail, template: 'payment-approved', reference: payment.order.reference })
    return { payment: serializeMoney(updated), orderId: payment.orderId, orderStatus: 'PAID', paypalStatus: 'COMPLETED' }
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

  async reverse(paymentId, { reason }, adminUser) {
    if (adminUser.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    if (!String(reason || '').trim()) throw new HttpError(400, 'Reason is required')

    const payment = await this.prisma.payment.findUnique({ where: { id: Number(paymentId) }, include: { order: true } })
    if (!payment) throw new HttpError(404, 'Payment not found')
    if (!['APPROVED', 'PROCESSING'].includes(payment.status)) throw new HttpError(409, 'Payment cannot be reversed in current state')

    const result = await this.provider.refundPayment({ transactionId: payment.providerTransactionId, reason, mode: 'reverse' })
    const sanitized = clean({ ...result, adminId: adminUser.id, reason })

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.payment.update({ where: { id: payment.id }, data: { status: 'REVERSED', reversedAt: new Date(), failureMessage: `Reversed by admin ${adminUser.id}: ${String(reason).trim()}`, sanitizedResponse: sanitized } })
      if (payment.order.status !== 'REFUNDED') {
        if (payment.order.status !== 'REFUND_PENDING') {
          if (payment.order.status !== 'CANCELLED') assertOrderTransition(payment.order.status, 'REFUND_PENDING')
          await tx.order.update({ where: { id: payment.orderId }, data: { status: 'REFUND_PENDING' } })
        }
        assertOrderTransition('REFUND_PENDING', 'REFUNDED')
        await tx.order.update({ where: { id: payment.orderId }, data: { status: 'REFUNDED' } })
      }
      return row
    })

    return serializeMoney(updated)
  }

  async refund(paymentId, { reason }, adminUser) {
    if (adminUser.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    if (!String(reason || '').trim()) throw new HttpError(400, 'Reason is required')

    const payment = await this.prisma.payment.findUnique({ where: { id: Number(paymentId) }, include: { order: true } })
    if (!payment) throw new HttpError(404, 'Payment not found')
    if (!['APPROVED', 'REVERSED'].includes(payment.status)) throw new HttpError(409, 'Payment cannot be refunded in current state')

    const result = await this.provider.refundPayment({ transactionId: payment.providerTransactionId, reason, mode: 'refund' })
    const sanitized = clean({ ...result, adminId: adminUser.id, reason })

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED', refundedAt: new Date(), failureMessage: `Refunded by admin ${adminUser.id}: ${String(reason).trim()}`, sanitizedResponse: sanitized } })
      if (payment.order.status !== 'REFUNDED') {
        if (payment.order.status !== 'REFUND_PENDING') {
          if (payment.order.status !== 'CANCELLED') assertOrderTransition(payment.order.status, 'REFUND_PENDING')
          await tx.order.update({ where: { id: payment.orderId }, data: { status: 'REFUND_PENDING' } })
        }
        assertOrderTransition('REFUND_PENDING', 'REFUNDED')
        await tx.order.update({ where: { id: payment.orderId }, data: { status: 'REFUNDED' } })
      }
      return row
    })

    return serializeMoney(updated)
  }
}
