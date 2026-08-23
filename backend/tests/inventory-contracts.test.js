import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { catalogProducts } from '../prisma/catalogProducts.js'
import { ProductService } from '../src/services/productService.js'

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

test('seed never deletes users and E2E script requires the test database', async () => {
  const seed = await readFile(new URL('../prisma/seed.js', import.meta.url), 'utf8')
  const e2e = await readFile(new URL('../scripts/e2e-payphone.js', import.meta.url), 'utf8')
  assert.doesNotMatch(seed, /user\.deleteMany|product\.deleteMany/)
  assert.match(e2e, /databaseName !== 'wilmas_fashion_test'/)
  assert.match(e2e, /cleanupArtifacts/)
})
