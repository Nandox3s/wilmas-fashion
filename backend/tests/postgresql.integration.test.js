import test from 'node:test'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'

assert.equal(decodeURIComponent(new URL(process.env.DATABASE_URL).pathname), '/wilmas_fashion_test')
const { createApp } = await import('../src/app.js')
const prisma = new PrismaClient()
const app = createApp({ prisma })

const auth = (token) => ({ Authorization: `Bearer ${token}` })
const customer = { customerName: 'Integration User', customerEmail: 'integration-user@example.test', identificationType: 'CEDULA', identificationNumber: '0000000000', address: 'Test address', city: 'Quito', phone: '0000000000' }

async function clean() {
  await prisma.order.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()
}

test('real PostgreSQL order, payment, invoice and authorization workflow', async () => {
  await clean()
  assert.equal((await request(app).get('/api/ping')).status, 200)

  const userRegistration = await request(app).post('/api/auth/register').send({ name: 'Integration User', email: customer.customerEmail, password: 'integration-password', role: 'ADMIN' })
  assert.equal(userRegistration.status, 201)
  assert.equal(userRegistration.body.user.role, 'USER')
  const userToken = userRegistration.body.token

  const adminRegistration = await request(app).post('/api/auth/register').send({ name: 'Integration Admin', email: 'integration-admin@example.test', password: 'integration-password' })
  assert.equal(adminRegistration.status, 201)
  await prisma.user.update({ where: { email: 'integration-admin@example.test' }, data: { role: 'ADMIN' } })
  const adminLogin = await request(app).post('/api/auth/login').send({ email: 'integration-admin@example.test', password: 'integration-password' })
  assert.equal(adminLogin.status, 200)
  assert.equal(adminLogin.body.user.role, 'ADMIN')
  const adminToken = adminLogin.body.token

  const productOne = await request(app).post('/api/products').set(auth(userToken)).send({ name: 'Integration Blouse', sku: 'INT-001', brand: 'Wilmas', category: 'Blouses', sizes: ['S', 'M'], color: 'Wine', price: 20, discount: 10, onOffer: true, stock: 10 })
  const productTwo = await request(app).post('/api/products').set(auth(userToken)).send({ name: 'Integration Skirt', sku: 'INT-002', brand: 'Wilmas', category: 'Skirts', sizes: ['M'], color: 'Black', price: 30, stock: 8 })
  assert.equal(productOne.status, 201); assert.equal(productTwo.status, 201)
  assert.equal((await request(app).put(`/api/products/${productTwo.body.id}`).set(auth(userToken)).send({ price: 35, stock: 9 })).status, 200)
  assert.equal((await request(app).delete(`/api/products/${productTwo.body.id}`).set(auth(userToken))).status, 403)

  const orderInput = { ...customer, items: [{ productId: productOne.body.id, quantity: 2, size: 'M', color: 'Wine', price: 0.01 }, { productId: productTwo.body.id, quantity: 1, size: 'M', color: 'Black', price: 0.01 }] }
  const order = await request(app).post('/api/orders').set(auth(userToken)).send(orderInput)
  assert.equal(order.status, 201)
  assert.equal(order.body.items.length, 2)
  assert.equal(Number(order.body.subtotal), 75)
  assert.equal((await prisma.product.findUnique({ where: { id: productOne.body.id } })).stock, 8)
  assert.equal((await prisma.inventoryReservation.count({ where: { orderId: order.body.id, status: 'ACTIVE' } })), 2)

  const payment = await request(app).post('/api/payments/create').set(auth(userToken)).send({ orderReference: order.body.reference, idempotencyKey: 'integration-approved', scenario: 'approved' })
  assert.equal(payment.status, 201)
  const repeated = await request(app).post('/api/payments/create').set(auth(userToken)).send({ orderReference: order.body.reference, idempotencyKey: 'integration-approved', scenario: 'approved' })
  assert.equal(repeated.status, 201); assert.equal(repeated.body.id, payment.body.id)
  const approved = await request(app).post('/api/payments/confirm').send({ paymentId: payment.body.id, transactionId: payment.body.providerTransactionId, scenario: 'approved', externalEventId: 'integration-approved-event' })
  assert.equal(approved.status, 200); assert.equal(approved.body.status, 'APPROVED')
  const approvedAgain = await request(app).post('/api/payments/confirm').send({ paymentId: payment.body.id, transactionId: payment.body.providerTransactionId, scenario: 'approved', externalEventId: 'integration-approved-event' })
  assert.equal(approvedAgain.status, 200)
  assert.equal(await prisma.paymentEvent.count({ where: { paymentId: payment.body.id } }), 1)

  const invoice = await prisma.invoice.findUnique({ where: { orderId: order.body.id }, include: { events: true } })
  assert.equal(invoice.provider, 'mock'); assert.equal(invoice.status, 'AUTHORIZED')
  assert.match(invoice.events[0].message, /DEMO/)
  const xmlResponse = await request(app).get(`/api/invoices/${invoice.id}/xml-url`).set(auth(userToken))
  assert.equal(xmlResponse.status, 200); assert.equal(xmlResponse.body.demo, true)
  assert.equal(xmlResponse.headers['cache-control'], 'no-store')
  assert.match(Buffer.from(xmlResponse.body.url.split(',')[1], 'base64').toString(), /NOT A TAX DOCUMENT/)

  const rejectedOrder = await request(app).post('/api/orders').set(auth(userToken)).send({ ...customer, items: [{ productId: productOne.body.id, quantity: 1, size: 'S', color: 'Wine' }] })
  const rejectedPayment = await request(app).post('/api/payments/create').set(auth(userToken)).send({ orderReference: rejectedOrder.body.reference, idempotencyKey: 'integration-rejected', scenario: 'rejected' })
  const rejected = await request(app).post('/api/payments/confirm').send({ paymentId: rejectedPayment.body.id, transactionId: rejectedPayment.body.providerTransactionId, scenario: 'rejected', externalEventId: 'integration-rejected-event' })
  assert.equal(rejected.body.status, 'REJECTED')
  assert.equal((await prisma.product.findUnique({ where: { id: productOne.body.id } })).stock, 8)

  const disposable = await request(app).post('/api/products').set(auth(adminToken)).send({ name: 'Disposable Product', sku: 'INT-DELETE', brand: 'Wilmas', category: 'Test', sizes: ['M'], color: 'Black', price: 1, stock: 1 })
  assert.equal(disposable.status, 201)
  assert.equal((await request(app).delete(`/api/products/${disposable.body.id}`).set(auth(adminToken))).status, 200)
  assert.equal((await request(app).get('/api/products')).status, 200)
  await clean()
})

test('healthcheck handles a real unavailable PostgreSQL connection without leaking details', async () => {
  const unavailable = new PrismaClient({ datasources: { db: { url: 'postgresql://invalid:invalid@127.0.0.1:1/wilmas_fashion_test?connect_timeout=1' } } })
  const response = await request(createApp({ prisma: unavailable })).get('/api/ping')
  assert.equal(response.status, 500)
  assert.equal(response.body.error, 'Internal server error')
  assert.doesNotMatch(JSON.stringify(response.body), /invalid|127\.0\.0\.1/)
  await unavailable.$disconnect()
})

test.after(async () => { await clean(); await prisma.$disconnect() })
