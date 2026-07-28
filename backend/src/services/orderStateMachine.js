import { HttpError } from '../utils/errors.js'

const ALLOWED = new Map([
  ['CREATED', new Set(['PENDING_PAYMENT', 'CANCELLED'])],
  ['PENDING_PAYMENT', new Set(['PAYMENT_PROCESSING', 'PAYMENT_FAILED', 'CANCELLED', 'EXPIRED'])],
  ['PAYMENT_PROCESSING', new Set(['PAID', 'PAYMENT_FAILED', 'CANCELLED'])],
  ['PAYMENT_FAILED', new Set(['PENDING_PAYMENT', 'CANCELLED'])],
  ['PAID', new Set(['INVOICE_PENDING', 'INVOICING', 'PREPARING', 'REFUND_PENDING'])],
  ['INVOICE_PENDING', new Set(['INVOICING', 'INVOICE_AUTHORIZED', 'PREPARING', 'REFUND_PENDING'])],
  ['INVOICING', new Set(['INVOICE_AUTHORIZED', 'PREPARING', 'REFUND_PENDING'])],
  ['INVOICE_AUTHORIZED', new Set(['PREPARING', 'READY_TO_SHIP', 'REFUND_PENDING'])],
  ['PREPARING', new Set(['READY_TO_SHIP', 'CANCELLED'])],
  ['READY_TO_SHIP', new Set(['SHIPPED', 'CANCELLED'])],
  ['SHIPPED', new Set(['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED'])],
  ['IN_TRANSIT', new Set(['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED'])],
  ['OUT_FOR_DELIVERY', new Set(['DELIVERED', 'RETURN_REQUESTED'])],
  ['DELIVERED', new Set(['RETURN_REQUESTED', 'RETURNED'])],
  ['REFUND_PENDING', new Set(['REFUNDED'])],
  ['RETURN_REQUESTED', new Set(['RETURNED'])],
  ['INVOICED', new Set(['PREPARING', 'READY_TO_SHIP', 'REFUND_PENDING'])],
])

export function assertOrderTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return
  const allowedNext = ALLOWED.get(currentStatus)
  if (!allowedNext || !allowedNext.has(nextStatus)) {
    throw new HttpError(409, `Invalid order transition: ${currentStatus} -> ${nextStatus}`)
  }
}
