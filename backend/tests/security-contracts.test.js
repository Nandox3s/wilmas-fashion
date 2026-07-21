import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import request from 'supertest'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
const { createApp } = await import('../src/app.js')

function repository() {
  const users = [
    { id: 1, name: 'Admin', email: 'admin@example.com', password: bcryptjs.hashSync('password123', 4), role: 'ADMIN' },
    { id: 2, name: 'User', email: 'user@example.com', password: bcryptjs.hashSync('password123', 4), role: 'USER' },
  ]
  const products = [{ id: 1, name: 'Blusa', sku: 'SKU-1', brand: 'Wilmas', category: 'Blusas', sizes: ['S', 'M'], color: 'Vino', price: 20, discount: 0, onOffer: false, stock: 5, createdAt: new Date() }]
  const prisma = {
    $queryRaw: async () => [{ '?column?': 1 }],
    user: {
      findUnique: async ({ where }) => users.find((item) => item.id === where.id || item.email === where.email) || null,
      create: async ({ data }) => { const item = { id: users.length + 1, ...data }; users.push(item); return item },
      findMany: async () => users.map(({ password, ...item }) => item),
      update: async ({ where, data }) => Object.assign(users.find((item) => item.id === where.id), data),
      delete: async ({ where }) => users.splice(users.findIndex((item) => item.id === where.id), 1)[0],
      count: async () => users.length,
    },
    product: {
      findUnique: async ({ where }) => products.find((item) => item.id === where.id || item.sku === where.sku) || null,
      findMany: async () => products,
      count: async () => products.length,
      create: async ({ data }) => { if (products.some((item) => item.sku === data.sku)) throw Object.assign(new Error('duplicate'), { code: 'P2002' }); const item = { id: products.length + 1, createdAt: new Date(), ...data }; products.push(item); return item },
      update: async ({ where, data }) => Object.assign(products.find((item) => item.id === where.id), data),
      delete: async ({ where }) => products.splice(products.findIndex((item) => item.id === where.id), 1)[0],
      updateMany: async () => ({ count: 1 }),
    },
    sale: { count: async () => 0, aggregate: async () => ({ _sum: { total: 0 } }), findMany: async () => [] },
  }
  return { prisma, users, products }
}

const bearer = (user) => `Bearer ${jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' })}`

test('healthcheck confirms database connection', async () => { const { prisma } = repository(); const response = await request(createApp({ prisma })).get('/api/ping'); assert.equal(response.status, 200); assert.equal(response.body.database, 'connected') })
test('healthcheck fails in a controlled way without database', async () => { const { prisma } = repository(); prisma.$queryRaw = async () => { throw new Error('secret connection detail') }; const response = await request(createApp({ prisma })).get('/api/ping'); assert.equal(response.status, 500); assert.equal(response.body.error, 'Internal server error'); assert.doesNotMatch(JSON.stringify(response.body), /secret connection/) })
test('registration creates USER and ignores ADMIN input', async () => { const { prisma } = repository(); const response = await request(createApp({ prisma })).post('/api/auth/register').send({ name: 'New User', email: 'new@example.com', password: 'password123', role: 'ADMIN' }); assert.equal(response.status, 201); assert.equal(response.body.user.role, 'USER'); assert.ok(response.body.token); assert.equal(response.body.user.password, undefined) })
test('duplicate registration returns 409', async () => { const { prisma } = repository(); const response = await request(createApp({ prisma })).post('/api/auth/register').send({ name: 'User', email: 'user@example.com', password: 'password123' }); assert.equal(response.status, 409) })
test('login returns JWT without password', async () => { const { prisma } = repository(); const response = await request(createApp({ prisma })).post('/api/auth/login').send({ email: 'user@example.com', password: 'password123' }); assert.equal(response.status, 200); assert.ok(response.body.token); assert.equal(response.body.user.password, undefined); assert.equal(jwt.verify(response.body.token, process.env.JWT_SECRET).email, 'user@example.com') })
test('invalid login is rejected', async () => { const { prisma } = repository(); const response = await request(createApp({ prisma })).post('/api/auth/login').send({ email: 'user@example.com', password: 'wrong' }); assert.equal(response.status, 401) })
test('protected endpoint returns 401 without token', async () => { const { prisma } = repository(); assert.equal((await request(createApp({ prisma })).post('/api/products').send({})).status, 401) })
test('USER cannot delete product', async () => { const { prisma, users } = repository(); assert.equal((await request(createApp({ prisma })).delete('/api/products/1').set('Authorization', bearer(users[1]))).status, 403) })
test('ADMIN can delete product', async () => { const { prisma, users } = repository(); assert.equal((await request(createApp({ prisma })).delete('/api/products/1').set('Authorization', bearer(users[0]))).status, 200) })
test('USER can create a valid product', async () => { const { prisma, users } = repository(); const response = await request(createApp({ prisma })).post('/api/products').set('Authorization', bearer(users[1])).send({ name: 'Falda', sku: 'SKU-2', brand: 'Wilmas', category: 'Faldas', sizes: ['S'], color: 'Negro', price: 30, stock: 3 }); assert.equal(response.status, 201); assert.equal(response.body.sku, 'SKU-2') })
test('duplicate SKU returns 409', async () => { const { prisma, users } = repository(); const response = await request(createApp({ prisma })).post('/api/products').set('Authorization', bearer(users[1])).send({ name: 'Otra', sku: 'SKU-1', brand: 'Wilmas', category: 'Faldas', sizes: ['S'], color: 'Negro', price: 30, stock: 3 }); assert.equal(response.status, 409) })
test('negative price returns 400', async () => { const { prisma, users } = repository(); const response = await request(createApp({ prisma })).post('/api/products').set('Authorization', bearer(users[1])).send({ name: 'Otra', sku: 'SKU-X', brand: 'Wilmas', category: 'Faldas', sizes: ['S'], color: 'Negro', price: -1, stock: 3 }); assert.equal(response.status, 400) })
test('negative stock returns 400', async () => { const { prisma, users } = repository(); const response = await request(createApp({ prisma })).post('/api/products').set('Authorization', bearer(users[1])).send({ name: 'Otra', sku: 'SKU-X', brand: 'Wilmas', category: 'Faldas', sizes: ['S'], color: 'Negro', price: 1, stock: -1 }); assert.equal(response.status, 400) })
test('expired JWT returns 401', async () => { const { prisma, users } = repository(); const token = jwt.sign({ userId: users[1].id }, process.env.JWT_SECRET, { expiresIn: -1 }); assert.equal((await request(createApp({ prisma })).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status, 401) })
test('unknown route returns consistent 404', async () => { const { prisma } = repository(); const response = await request(createApp({ prisma })).get('/not-real'); assert.equal(response.status, 404); assert.equal(response.body.code, 'NOT_FOUND') })

const schema = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8')
for (const [name, pattern] of [
  ['PostgreSQL datasource', /provider\s*=\s*"postgresql"/], ['closed Role enum', /enum Role[\s\S]*?USER[\s\S]*?ADMIN/],
  ['Order model', /model Order \{/], ['OrderItem model', /model OrderItem \{/], ['Payment model', /model Payment \{/],
  ['PaymentEvent uniqueness', /@@unique\(\[provider, externalEventId\]\)/], ['Invoice model', /model Invoice \{/],
  ['InvoiceEvent model', /model InvoiceEvent \{/], ['inventory reservation', /model InventoryReservation \{/],
  ['money uses Decimal', /price\s+Decimal\s+@db\.Decimal\(12, 2\)/], ['Sale retained', /model Sale \{/],
]) test(`schema contract: ${name}`, () => assert.match(schema, pattern))
