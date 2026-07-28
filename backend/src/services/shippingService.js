import { assertOrderTransition } from './orderStateMachine.js'
import { HttpError } from '../utils/errors.js'
import { serializeMoney } from '../utils/validation.js'

function isSafeTrackingUrl(value) {
  if (!value) return true
  try {
    const url = new URL(String(value))
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function sanitizeTrackingUrl(value) {
  if (!value) return null
  if (!isSafeTrackingUrl(value)) throw new HttpError(400, 'Tracking URL must use http or https')
  return String(value)
}

export class ShippingService {
  constructor(prisma, provider, emailService) {
    this.prisma = prisma
    this.provider = provider
    this.emailService = emailService
  }

  async _transaction(cb) {
    if (typeof this.prisma.$transaction === 'function') return this.prisma.$transaction(cb)
    return cb(this.prisma)
  }

  authorize(order, user) {
    if (user.role !== 'ADMIN' && order.userId !== user.id) throw new HttpError(403, 'Forbidden')
  }

  async byOrder(orderId, user) {
    const order = await this.prisma.order.findUnique({ where: { id: Number(orderId) }, include: { shipment: { include: { events: { orderBy: { occurredAt: 'asc' } } } } } })
    if (!order) throw new HttpError(404, 'Order not found')
    this.authorize(order, user)
    if (!order.shipment) throw new HttpError(404, 'Shipment not found')
    return serializeMoney(order.shipment)
  }

  async tracking(orderId, user) {
    const shipment = await this.byOrder(orderId, user)
    const providerState = await this.provider.getTracking({ shipment })
    return { ...shipment, providerState }
  }

  async createForOrder(orderId, input, adminUser) {
    const order = await this.prisma.order.findUnique({ where: { id: Number(orderId) }, include: { shipment: true } })
    if (!order) throw new HttpError(404, 'Order not found')
    if (adminUser.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    if (!['PAID', 'INVOICE_PENDING', 'INVOICE_AUTHORIZED', 'INVOICED', 'PREPARING', 'READY_TO_SHIP'].includes(order.status)) {
      throw new HttpError(409, 'Order must be paid before shipment registration')
    }

    const nextStatus = input.status || 'READY_FOR_PICKUP'
    const data = {
      provider: input.provider || 'manual',
      carrierName: input.carrierName ? String(input.carrierName).trim() : null,
      externalShipmentId: input.externalShipmentId ? String(input.externalShipmentId).trim() : null,
      trackingNumber: input.trackingNumber ? String(input.trackingNumber).trim() : null,
      trackingUrl: sanitizeTrackingUrl(input.trackingUrl),
      status: nextStatus,
      shippingCost: input.shippingCost === undefined || input.shippingCost === null ? null : Number(input.shippingCost).toFixed(2),
      estimatedDelivery: input.estimatedDelivery ? new Date(input.estimatedDelivery) : null,
      shippedAt: input.shippedAt ? new Date(input.shippedAt) : null,
      notes: input.notes ? String(input.notes).trim() : null,
    }

    const providerResponse = await this.provider.createShipment({ order, shipment: data })

    const created = await this._transaction(async (tx) => {
      const shipment = await tx.shipment.upsert({
        where: { orderId: order.id },
        update: {
          ...data,
          externalShipmentId: data.externalShipmentId || providerResponse.externalShipmentId || undefined,
          status: providerResponse.status || data.status,
        },
        create: {
          orderId: order.id,
          ...data,
          externalShipmentId: data.externalShipmentId || providerResponse.externalShipmentId || null,
          status: providerResponse.status || data.status,
        },
      })

      await tx.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          status: shipment.status,
          description: `Shipment registered by admin ${adminUser.id}`,
          occurredAt: new Date(),
        },
      })

      if (order.status === 'PAID' || order.status === 'INVOICE_PENDING' || order.status === 'INVOICE_AUTHORIZED' || order.status === 'INVOICED') {
        assertOrderTransition(order.status, 'PREPARING')
        await tx.order.update({ where: { id: order.id }, data: { status: 'PREPARING' } })
      }

      return shipment
    })

    await this.emailService.send({ to: order.customerEmail, template: 'order-shipping-registered', reference: order.reference })
    return serializeMoney(created)
  }

  async patchShipment(shipmentId, input, adminUser) {
    if (adminUser.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    const shipment = await this.prisma.shipment.findUnique({ where: { id: Number(shipmentId) }, include: { order: true } })
    if (!shipment) throw new HttpError(404, 'Shipment not found')

    const nextStatus = input.status || shipment.status
    const patch = {
      carrierName: input.carrierName === undefined ? undefined : (input.carrierName ? String(input.carrierName).trim() : null),
      trackingNumber: input.trackingNumber === undefined ? undefined : (input.trackingNumber ? String(input.trackingNumber).trim() : null),
      trackingUrl: input.trackingUrl === undefined ? undefined : sanitizeTrackingUrl(input.trackingUrl),
      estimatedDelivery: input.estimatedDelivery === undefined ? undefined : (input.estimatedDelivery ? new Date(input.estimatedDelivery) : null),
      notes: input.notes === undefined ? undefined : (input.notes ? String(input.notes).trim() : null),
      status: nextStatus,
    }

    const updated = await this._transaction(async (tx) => {
      const row = await tx.shipment.update({ where: { id: shipment.id }, data: patch })
      await tx.shipmentEvent.create({ data: { shipmentId: shipment.id, status: row.status, description: input.description ? String(input.description).trim() : 'Shipment updated', location: input.location ? String(input.location).trim() : null } })
      return row
    })

    return serializeMoney(updated)
  }

  async addEvent(shipmentId, input, adminUser) {
    if (adminUser.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    const shipment = await this.prisma.shipment.findUnique({ where: { id: Number(shipmentId) } })
    if (!shipment) throw new HttpError(404, 'Shipment not found')
    if (!input.status) throw new HttpError(400, 'Status is required')

    const event = await this.prisma.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        status: String(input.status),
        description: input.description ? String(input.description).trim() : null,
        location: input.location ? String(input.location).trim() : null,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      },
    })

    await this.prisma.shipment.update({ where: { id: shipment.id }, data: { status: event.status } })
    return event
  }

  async markShipped(shipmentId, input, adminUser) {
    if (adminUser.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    const shipment = await this.prisma.shipment.findUnique({ where: { id: Number(shipmentId) }, include: { order: true } })
    if (!shipment) throw new HttpError(404, 'Shipment not found')

    if (['PAID', 'INVOICE_PENDING', 'INVOICE_AUTHORIZED', 'INVOICED', 'PREPARING'].includes(shipment.order.status)) {
      assertOrderTransition(shipment.order.status, 'READY_TO_SHIP')
    }

    const updated = await this._transaction(async (tx) => {
      const row = await tx.shipment.update({ where: { id: shipment.id }, data: { status: 'SHIPPED', shippedAt: new Date() } })
      await tx.shipmentEvent.create({ data: { shipmentId: shipment.id, status: 'SHIPPED', description: input?.description ? String(input.description).trim() : 'Shipment dispatched' } })
      if (['PAID', 'INVOICE_PENDING', 'INVOICE_AUTHORIZED', 'INVOICED', 'PREPARING'].includes(shipment.order.status)) {
        if (shipment.order.status !== 'READY_TO_SHIP') await tx.order.update({ where: { id: shipment.orderId }, data: { status: 'READY_TO_SHIP' } })
        assertOrderTransition('READY_TO_SHIP', 'SHIPPED')
        await tx.order.update({ where: { id: shipment.orderId }, data: { status: 'SHIPPED' } })
      }
      return row
    })

    await this.emailService.send({ to: shipment.order.customerEmail, template: 'order-shipped', reference: shipment.order.reference })
    return serializeMoney(updated)
  }

  async markDelivered(shipmentId, input, adminUser) {
    if (adminUser.role !== 'ADMIN') throw new HttpError(403, 'Forbidden')
    const shipment = await this.prisma.shipment.findUnique({ where: { id: Number(shipmentId) }, include: { order: true } })
    if (!shipment) throw new HttpError(404, 'Shipment not found')

    const updated = await this._transaction(async (tx) => {
      const row = await tx.shipment.update({ where: { id: shipment.id }, data: { status: 'DELIVERED', deliveredAt: new Date() } })
      await tx.shipmentEvent.create({ data: { shipmentId: shipment.id, status: 'DELIVERED', description: input?.description ? String(input.description).trim() : 'Shipment delivered' } })
      if (shipment.order.status !== 'DELIVERED') {
        if (['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'READY_TO_SHIP'].includes(shipment.order.status)) {
          assertOrderTransition(shipment.order.status, 'DELIVERED')
          await tx.order.update({ where: { id: shipment.orderId }, data: { status: 'DELIVERED' } })
        }
      }
      return row
    })

    await this.emailService.send({ to: shipment.order.customerEmail, template: 'order-delivered', reference: shipment.order.reference })
    return serializeMoney(updated)
  }
}
