import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters'
process.env.PAYPAL_ENV = 'sandbox'
process.env.PAYPAL_CLIENT_ID = 'sandbox-client-id'
process.env.PAYPAL_CLIENT_SECRET = 'sandbox-client-secret'

const { PaymentService } = await import('../src/services/paymentService.js')
const { PayPalProvider } = await import('../src/providers/payments/PayPalProvider.js')

function repository({ captureAmount = '29.99', captureCurrency = 'USD', customId = 'WF-PAYPAL-1' } = {}) {
  const order = { id: 41, userId: 7, reference: 'WF-PAYPAL-1', total: '29.99', currency: 'USD', status: 'PENDING_PAYMENT', customerEmail: 'buyer@example.com', expiresAt: new Date(Date.now() + 60_000) }
  const payments = []
  const events = []
  let createCalls = 0
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    order: {
      findUnique: async ({ where }) => where.id === order.id ? order : null,
      update: async ({ data }) => Object.assign(order, { ...data, reservations: undefined }),
    },
    payment: {
      findUnique: async ({ where, include }) => { const row = payments.find((item) => item.id === where.id || item.idempotencyKey === where.idempotencyKey) || null; return row && include?.order ? { ...row, order } : row },
      findFirst: async ({ where, include }) => { const row = payments.find((item) => item.orderId === where.orderId && item.provider === where.provider && item.providerTransactionId === where.providerTransactionId) || null; return row && include?.order ? { ...row, order } : row },
      create: async ({ data }) => { const row = { id: payments.length + 1, ...data }; payments.push(row); return row },
      updateMany: async ({ where, data }) => { const row = payments.find((item) => item.id === where.id && item.status === where.status); if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 } },
    },
    paymentEvent: {
      findUnique: async ({ where }) => events.find((item) => item.provider === where.provider_externalEventId.provider && item.externalEventId === where.provider_externalEventId.externalEventId) || null,
      create: async ({ data }) => { events.push(data); return data },
    },
  }
  const paypal = {
    createOrder: async ({ order: source }) => {
      createCalls += 1
      assert.equal(String(source.total), '29.99')
      return { id: 'PAYPAL-ORDER-1', status: 'CREATED' }
    },
    captureOrder: async () => ({
      id: 'PAYPAL-ORDER-1', status: 'COMPLETED',
      purchase_units: [{ reference_id: '41', custom_id: customId, payments: { captures: [{ id: 'CAPTURE-1', status: 'COMPLETED', amount: { value: captureAmount, currency_code: captureCurrency } }] } }],
    }),
  }
  const emails = []
  const service = new PaymentService(prisma, null, { send: async (message) => emails.push(message) }, null, paypal)
  return { service, order, payments, events, emails, createCalls: () => createCalls }
}

test('PayPal create order trusts only the local database total', async () => {
  const state = repository()
  const result = await state.service.createPaypalOrder({ orderId: 41, amount: '0.01', currency: 'EUR' }, { id: 7, role: 'USER' })
  assert.equal(result.paypalOrderId, 'PAYPAL-ORDER-1')
  assert.equal(state.payments[0].amount, '29.99')
  assert.equal(state.payments[0].currency, 'USD')
  assert.equal(state.order.status, 'PAYMENT_PROCESSING')
  const repeated = await state.service.createPaypalOrder({ orderId: 41 }, { id: 7, role: 'USER' })
  assert.equal(repeated.paypalOrderId, result.paypalOrderId)
  assert.equal(state.createCalls(), 1)
})

test('PayPal capture marks the local order PAID only after COMPLETED and exact amount validation', async () => {
  const state = repository()
  await state.service.createPaypalOrder({ orderId: 41 }, { id: 7, role: 'USER' })
  const result = await state.service.capturePaypalOrder({ paypalOrderId: 'PAYPAL-ORDER-1', orderId: 41 }, { id: 7, role: 'USER' })
  assert.equal(result.paypalStatus, 'COMPLETED')
  assert.equal(state.order.status, 'PAID')
  assert.equal(state.payments[0].status, 'APPROVED')
  assert.equal(state.events.length, 1)
  assert.equal(state.emails.length, 1)
})

test('PayPal capture blocks a manipulated amount and leaves the order unpaid', async () => {
  const state = repository({ captureAmount: '0.01' })
  await state.service.createPaypalOrder({ orderId: 41 }, { id: 7, role: 'USER' })
  await assert.rejects(() => state.service.capturePaypalOrder({ paypalOrderId: 'PAYPAL-ORDER-1', orderId: 41 }, { id: 7, role: 'USER' }), /amount does not match/i)
  assert.equal(state.order.status, 'PAYMENT_PROCESSING')
  assert.equal(state.payments[0].status, 'PROCESSING')
})

test('PayPal capture blocks a second capture', async () => {
  const state = repository()
  await state.service.createPaypalOrder({ orderId: 41 }, { id: 7, role: 'USER' })
  await state.service.capturePaypalOrder({ paypalOrderId: 'PAYPAL-ORDER-1', orderId: 41 }, { id: 7, role: 'USER' })
  await assert.rejects(() => state.service.capturePaypalOrder({ paypalOrderId: 'PAYPAL-ORDER-1', orderId: 41 }, { id: 7, role: 'USER' }), /already captured/i)
  assert.equal(state.events.length, 1)
})

test('PayPal provider uses Sandbox Orders v2 and sends the database amount', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/v1/oauth2/token')) return { ok: true, json: async () => ({ access_token: 'temporary-token' }) }
    return { ok: true, json: async () => ({ id: 'PAYPAL-ORDER-2', status: 'CREATED' }) }
  }
  const provider = new PayPalProvider(fetchImpl)
  await provider.createOrder({ order: { id: 9, reference: 'WF-9', total: '48.25' }, requestId: 'paypal-create-9' })
  assert.equal(calls.length, 2)
  assert.equal(calls[1].url, 'https://api-m.sandbox.paypal.com/v2/checkout/orders')
  const body = JSON.parse(calls[1].options.body)
  assert.equal(body.purchase_units[0].amount.value, '48.25')
  assert.equal(body.purchase_units[0].amount.currency_code, 'USD')
  assert.equal(body.purchase_units[0].custom_id, 'WF-9')
})
