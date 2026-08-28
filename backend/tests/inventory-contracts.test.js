import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { catalogProducts } from '../prisma/catalogProducts.js'
import { ProductService } from '../src/services/productService.js'
import { OrderService } from '../src/services/orderService.js'

test('real catalog contains 17 unique local images and SKUs', () => {
  assert.equal(catalogProducts.length, 17)
  assert.equal(new Set(catalogProducts.map((product) => product.sku)).size, 17)
  assert.equal(new Set(catalogProducts.map((product) => product.image)).size, 17)
  catalogProducts.forEach((product) => assert.match(product.image, /^\/img_wf\/[A-Za-z0-9_]+\.jpg$/))
})

test('product API always requests active inventory only', async () => {
  let capturedWhere
  const prisma = {
    product: {
      findMany: async ({ where }) => { capturedWhere = where; return [] },
      count: async () => 0,
    },
  }
  await new ProductService(prisma).list({ limit: 100 })
  assert.equal(capturedWhere.isActive, true)
})

test('cash on delivery creates a pending payment and confirmed reservation without marking the order paid', async () => {
  let orderData
  const product = { id: 1, name: 'Blusa', sku: 'WF-1', brand: 'Wilmas', category: 'Blusas', sizes: ['M'], color: 'Vino', price: 25, discount: 0, onOffer: false }
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    product: { findMany: async () => [product], updateMany: async () => ({ count: 1 }) },
    order: { create: async ({ data }) => { orderData = data; return { id: 1, status: 'PENDING_PAYMENT', ...data, items: [], payments: [data.payments.create], invoice: null } } },
    billingProfile: { create: async () => ({}) },
  }
  await new OrderService(prisma).create({
    paymentMethod: 'cash_on_delivery', customerName: 'Cliente', customerEmail: 'cliente@example.com',
    identificationType: 'CEDULA', identificationNumber: '1234567890', address: 'Dirección válida', city: 'Quito', phone: '0999999999',
    items: [{ productId: 1, quantity: 1, size: 'M', color: 'Vino' }],
  }, { id: 9, email: 'cliente@example.com', name: 'Cliente' })
  assert.equal(orderData.payments.create.provider, 'cash_on_delivery')
  assert.equal(orderData.payments.create.status, 'PENDING')
  assert.equal(orderData.status, undefined)
  assert.equal(orderData.payments.create.confirmedAt, undefined)
  assert.equal(orderData.reservations.create[0].status, 'CONFIRMED')
  assert.ok(orderData.stockCommittedAt instanceof Date)
})

test('seed never deletes users and E2E script requires the test database', async () => {
  const seed = await readFile(new URL('../prisma/seed.js', import.meta.url), 'utf8')
  const e2e = await readFile(new URL('../scripts/e2e-payphone.js', import.meta.url), 'utf8')
  assert.doesNotMatch(seed, /user\.deleteMany|product\.deleteMany/)
  assert.match(e2e, /databaseName !== 'wilmas_fashion_test'/)
  assert.match(e2e, /cleanupArtifacts/)
})
