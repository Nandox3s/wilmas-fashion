import { PaymentProvider } from './PaymentProvider.js'

const base = () => (process.env.PAYPHONE_API_BASE || 'https://pay.payphonetodoesposible.com/api').replace(/\/$/, '')
const credentials = () => {
  if (!process.env.PAYPHONE_TOKEN || !process.env.PAYPHONE_STORE_ID) throw Object.assign(new Error('PayPhone sandbox credentials are not configured'), { status: 503 })
  return { token: process.env.PAYPHONE_TOKEN, storeId: process.env.PAYPHONE_STORE_ID }
}
async function post(path, body) {
  const { token } = credentials()
  const response = await fetch(`${base()}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error('PayPhone rejected the request'), { status: 502, providerStatus: response.status })
  return data
}

export class PayPhoneProvider extends PaymentProvider {
  async createPayment({ order }) {
    const { storeId } = credentials()
    if (!['sandbox', 'production'].includes(process.env.CHECKOUT_MODE)) throw Object.assign(new Error('PayPhone is only available in sandbox or explicitly enabled production mode'), { status: 503 })
    const taxable = Math.round((Number(order.subtotal) - Number(order.discount)) * 100)
    const tax = Math.round(Number(order.tax) * 100); const service = Math.round(Number(order.shipping) * 100)
    const payload = await post('/button/Prepare', { amount: taxable + tax + service, amountWithoutTax: 0, amountWithTax: taxable, tax, service, tip: 0, clientTransactionId: order.reference, reference: order.reference, storeId, currency: order.currency, responseUrl: process.env.PAYPHONE_RESPONSE_URL, cancellationUrl: process.env.PAYPHONE_CANCELLATION_URL, timeZone: -5 })
    return { provider: 'payphone', transactionId: String(payload.paymentId), clientTransactionId: order.reference, redirectUrl: payload.payWithCard || payload.payWithPayPhone }
  }
  async confirmPayment({ transactionId, clientTransactionId }) {
    const result = await post('/button/V2/Confirm', { id: Number(transactionId), clientTxId: clientTransactionId })
    return { transactionId: String(result.transactionId), clientTransactionId: result.clientTransactionId, amount: result.amount, currency: result.currency, status: result.transactionStatus === 'Approved' ? 'APPROVED' : 'REJECTED', statusCode: result.statusCode, messageCode: result.messageCode }
  }
  async verifyCallback(payload) {
    if (!Number.isInteger(Number(payload.id)) || typeof payload.clientTransactionId !== 'string' || !payload.clientTransactionId) throw Object.assign(new Error('Invalid PayPhone callback'), { status: 400 })
    return { valid: true, eventId: `payphone-${payload.id}`, transactionId: String(payload.id), clientTransactionId: payload.clientTransactionId }
  }
  async getTransaction() { throw Object.assign(new Error('PayPhone button transactions must be verified through the official Confirm operation'), { status: 501 }) }
  async refundPayment({ transactionId }) { return post('/Reverse', { id: Number(transactionId) }) }
}
