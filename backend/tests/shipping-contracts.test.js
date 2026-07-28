import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters'
const { createApp } = await import('../src/app.js')

function repo() {
  const users = [
    { id: 1, name: 'Admin', email: 'admin@example.com', password: bcryptjs.hashSync('password123', 4), role: 'ADMIN' },
    { id: 2, name: 'User', email: 'user@example.com', password: bcryptjs.hashSync('password123', 4), role: 'USER' },
  ]

  const orders = [{
    id: 1,
    reference: 'WF-REF-1',
    userId: 2,
    status: 'PAID',
    customerEmail: 'user@example.com',
    items: [],
    createdAt: new Date(),
  }]

  let shipment = null
  const events = []

  const prisma = {
    $queryRaw: async () => [{ '?column?': 1 }],
    user: { findUnique: async ({ where }) => users.find((u) => u.id === where.id || u.email === where.email) || null },
    order: {
      findUnique: async ({ where, include }) => {
        const row = orders.find((o) => o.id === where.id || o.reference === where.reference)
        if (!row) return null
        if (include?.shipment) return { ...row, shipment }
        return row
      },
      update: async ({ where, data }) => {
        const row = orders.find((o) => o.id === where.id)
        Object.assign(row, data)
        return row
      },
      findMany: async () => orders,
    },
    shipment: {
      upsert: async ({ create, update }) => {
        shipment = shipment ? { ...shipment, ...update } : { id: 1, ...create }
        return shipment
      },
      findUnique: async ({ where, include }) => {
        if (!shipment || shipment.id !== where.id) return null
        return include?.order ? { ...shipment, order: orders[0] } : shipment
      },
      update: async ({ where, data }) => {
        if (!shipment || shipment.id !== where.id) return null
        shipment = { ...shipment, ...data }
        return shipment
      },
    },
    shipmentEvent: {
      create: async ({ data }) => { const row = { id: events.length + 1, ...data }; events.push(row); return row },
      findMany: async () => events,
    },
    payment: { findUnique: async () => null, findFirst: async () => null },
    invoice: { findUnique: async () => null, findFirst: async () => null, upsert: async () => null },
    product: { count: async () => 0 },
    sale: { count: async () => 0, aggregate: async () => ({ _sum: { total: 0 } }), findMany: async () => [] },
    notification: { create: async () => null },
    billingProfile: { create: async () => null },
  }

  return { prisma, users, orders, events }
}

function bearer(user) {
  return `Bearer ${jwt.sign({ userId: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' })}`
}

test('admin can register manual shipment and user can read tracking', async () => {
  const { prisma, users } = repo()
  const app = createApp({ prisma })

  const create = await request(app)
    .post('/api/admin/orders/1/shipment')
    .set('Authorization', bearer(users[0]))
    .send({ carrierName: 'Servientrega', trackingNumber: 'ABC123', trackingUrl: 'https://tracking.example.test/ABC123', status: 'READY_FOR_PICKUP' })
  assert.equal(create.status, 201)
  assert.equal(create.body.trackingNumber, 'ABC123')

  const read = await request(app)
    .get('/api/orders/1/tracking')
    .set('Authorization', bearer(users[1]))
  assert.equal(read.status, 200)
  assert.equal(read.body.trackingNumber, 'ABC123')
})

test('rejects unsafe tracking URL', async () => {
  const { prisma, users } = repo()
  const app = createApp({ prisma })

  const response = await request(app)
    .post('/api/admin/orders/1/shipment')
    .set('Authorization', bearer(users[0]))
    .send({ trackingUrl: 'javascript:alert(1)' })

  assert.equal(response.status, 400)
})
