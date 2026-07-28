// E2E PayPhone idempotency test
// Requires a running backend (API_BASE) and a live PostgreSQL database.
// Does NOT use real payment or invoice providers.
// Set INVOICE_QUEUE_PROVIDER=postgres on the server to enable DB job assertions.
import { URL, fileURLToPath } from 'node:url'
import assert from 'node:assert'
import { spawnSync } from 'node:child_process'
import { prisma } from '../src/config/prisma.js'

const API = process.env.API_BASE || 'http://127.0.0.1:4000'
// When the server runs with INVOICE_QUEUE_PROVIDER=postgres, jobs are persisted
// and the worker must be run separately. When using 'local', invoices are
// processed inline and no Job rows are created.
const queueProvider = process.env.INVOICE_QUEUE_PROVIDER || 'local'
const expectDbJobs = queueProvider === 'postgres'

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } })
  const body = await res.text()
  let parsed
  try { parsed = JSON.parse(body) } catch { parsed = body }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} -> ${JSON.stringify(parsed)}`)
  return parsed
}

function runWorker(env = {}) {
  return spawnSync(process.execPath, ['src/workers/jobWorker.js'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: {
      ...process.env,
      WORKER_RUN_ONCE: '1',
      PAYMENT_PROVIDER: 'mock',
      INVOICE_PROVIDER: 'mock',
      INVOICE_QUEUE_PROVIDER: 'postgres',
      ...env,
    },
    encoding: 'utf8',
  })
}

async function run() {
  // ── Setup ──────────────────────────────────────────────────────────────────
  const testEmail = `e2e+${Date.now()}@example.test`
  const testPassword = 'P@ssw0rd123'
  await jsonFetch(`${API}/api/auth/register`, { method: 'POST', body: JSON.stringify({ name: 'E2E Test', email: testEmail, password: testPassword }) })
  const login = await jsonFetch(`${API}/api/auth/login`, { method: 'POST', body: JSON.stringify({ email: testEmail, password: testPassword }) })
  const token = login.token
  const headers = { Authorization: `Bearer ${token}` }

  const sku = `E2E-SKU-${Date.now()}`
  const product = await prisma.product.create({ data: { name: 'E2E Product', sku, brand: 'E2E', category: 'E2E', sizes: ['M'], color: 'Negro', price: 10.0, stock: 10 } })
  const stockBefore = product.stock

  const orderPayload = {
    customerName: 'E2E Tester', customerEmail: testEmail, identificationType: 'CEDULA',
    identificationNumber: '0102030405', address: 'Av. Siempre Viva 742', city: 'Quito', phone: '3000000000',
    items: [{ productId: product.id, quantity: 1, size: 'M', color: 'Negro' }],
    billingProfile: { legalName: 'E2E Test', billingEmail: testEmail, billingAddress: 'Av. Siempre Viva 742' },
  }
  const created = await jsonFetch(`${API}/api/orders`, { method: 'POST', headers, body: JSON.stringify(orderPayload) })
  console.log('Order created:', created.reference, 'id', created.id)

  // ── 1. Prepare ─────────────────────────────────────────────────────────────
  const prepare = await jsonFetch(`${API}/api/payments/payphone/prepare`, { method: 'POST', headers, body: JSON.stringify({ orderId: created.id }) })
  console.log('Prepare OK')

  // ── 2. Confirm ─────────────────────────────────────────────────────────────
  const confirm = await jsonFetch(`${API}/api/payments/payphone/confirm`, { method: 'POST', headers, body: JSON.stringify({ id: prepare.payment.id, clientTransactionId: prepare.payment.clientTransactionId }) })
  assert.equal(confirm.status, 'APPROVED', 'First confirm must be APPROVED')
  console.log('Confirm OK')

  // ── 3. Duplicate confirm ───────────────────────────────────────────────────
  const confirmDup = await jsonFetch(`${API}/api/payments/payphone/confirm`, { method: 'POST', headers, body: JSON.stringify({ id: prepare.payment.id, clientTransactionId: prepare.payment.clientTransactionId }) })
  assert.equal(confirmDup.status, 'APPROVED', 'Duplicate confirm must still return APPROVED')
  console.log('Duplicate confirm OK (idempotent)')

  // ── 4. Webhook ─────────────────────────────────────────────────────────────
  const webhookBody = { id: prepare.payphone.transactionId, clientTransactionId: prepare.payphone.clientTransactionId }
  const webhook = await jsonFetch(`${API}/api/webhooks/payphone`, { method: 'POST', body: JSON.stringify(webhookBody) })
  assert.ok(['APPROVED', 'approved'].includes(String(webhook.status).toLowerCase()), 'Webhook must return APPROVED')
  console.log('Webhook OK')

  // ── 5. Duplicate webhook ───────────────────────────────────────────────────
  const webhookDup = await jsonFetch(`${API}/api/webhooks/payphone`, { method: 'POST', body: JSON.stringify(webhookBody) })
  assert.ok(['APPROVED', 'approved'].includes(String(webhookDup.status).toLowerCase()), 'Duplicate webhook must return APPROVED')
  console.log('Duplicate webhook OK (idempotent)')

  // ── 6 & 7. Worker runs (only meaningful when queue=postgres) ───────────────
  if (expectDbJobs) {
    const worker1 = runWorker()
    if (worker1.status !== 0) throw new Error(`Worker run 1 failed: ${worker1.stderr || worker1.stdout}`)
    console.log('Worker run 1 OK')

    const worker2 = runWorker()
    if (worker2.status !== 0) throw new Error(`Worker run 2 failed: ${worker2.stderr || worker2.stdout}`)
    console.log('Worker run 2 OK (replay)')
  } else {
    console.log('Worker runs skipped (INVOICE_QUEUE_PROVIDER=local — invoice processed inline)')
  }

  // ── PostgreSQL count assertions ────────────────────────────────────────────
  const [
    approvedPayments,
    invoices,
    confirmedReservations,
    paymentEvents,
  ] = await Promise.all([
    prisma.payment.count({ where: { orderId: created.id, status: 'APPROVED' } }),
    prisma.invoice.count({ where: { orderId: created.id } }),
    prisma.inventoryReservation.count({ where: { orderId: created.id, status: 'CONFIRMED' } }),
    prisma.paymentEvent.count({ where: { paymentId: confirm.id } }),
  ])

  const productAfter = await prisma.product.findUnique({ where: { id: product.id } })
  const stockDeducted = stockBefore - productAfter.stock

  // DB job counts only when queue provider persists jobs
  let issueInvoiceJobs = null
  if (expectDbJobs) {
    issueInvoiceJobs = await prisma.job.count({
      where: { aggregateId: String(created.id), type: 'ISSUE_INVOICE', status: 'COMPLETED' },
    })
  }

  console.log({ approvedPayments, invoices, issueInvoiceJobs, confirmedReservations, paymentEvents, stockDeducted, queueProvider })

  assert.equal(approvedPayments, 1, 'Exactly 1 APPROVED payment')
  assert.equal(invoices, 1, 'Exactly 1 Invoice')
  assert.equal(confirmedReservations, 1, 'Exactly 1 confirmed reservation')
  assert.equal(paymentEvents, 1, 'Exactly 1 payment event (no duplicate external events)')
  assert.equal(stockDeducted, 1, 'Exactly 1 unit deducted from stock')

  if (expectDbJobs) {
    assert.equal(issueInvoiceJobs, 1, 'Exactly 1 completed ISSUE_INVOICE job')
  }

  // Final order state is stable after replays
  const orderFinal = await jsonFetch(`${API}/api/orders/${created.reference}`, { method: 'GET', headers })
  assert.ok(
    ['PAID', 'INVOICE_PENDING', 'INVOICED', 'PREPARING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'].includes(orderFinal.status),
    `Order status must be post-payment (got ${orderFinal.status})`,
  )

  const orderFinal2 = await jsonFetch(`${API}/api/orders/${created.reference}`, { method: 'GET', headers })
  assert.equal(orderFinal2.status, orderFinal.status, 'Order status must be stable after replay')

  console.log('All idempotency assertions passed.')
  console.log('E2E script finished.')
}

run()
  .catch((err) => { console.error('E2E failed:', err.message); process.exit(2) })
  .finally(() => prisma.$disconnect().catch(() => {}))
