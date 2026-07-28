import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { readFile } from 'node:fs/promises'
import { normalizeProductSizes, assertRequestedSize } from '../src/utils/normalizeProductSizes.js'
import { MockInvoiceProvider } from '../src/providers/invoices/MockInvoiceProvider.js'
import { DatilProvider, DatilProviderError } from '../src/providers/invoices/DatilProvider.js'
import { Buffer } from 'node:buffer'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://wilmas:change-me@localhost:5432/wilmas_fashion_test?schema=public'

const { createApp } = await import('../src/app.js')

function prismaStub() {
  return {
    $queryRaw: async () => [{ '?column?': 1 }],
    user: { findUnique: async () => null },
    order: { findUnique: async () => null, findMany: async () => [] },
    product: { findMany: async () => [] },
    payment: { findUnique: async () => null, findFirst: async () => null },
    invoice: { findUnique: async () => null, findFirst: async () => null, update: async () => null, upsert: async () => null },
    job: { create: async () => null },
    shipment: { findUnique: async () => null },
    shipmentEvent: { create: async () => null },
    notification: { create: async () => null },
    billingProfile: { create: async () => null },
    sale: { count: async () => 0, aggregate: async () => ({ _sum: { total: 0 } }), findMany: async () => [] },
  }
}

// ── normalizeProductSizes ──────────────────────────────────────────────────
test('normalizeProductSizes: valid inputs', () => {
  assert.deepEqual(normalizeProductSizes(['S', 'M', 'M']), ['S', 'M'])
  assert.deepEqual(normalizeProductSizes('[\"S\",\"L\"]'), ['S', 'L'])
  assert.deepEqual(normalizeProductSizes('S, M, L'), ['S', 'M', 'L'])
  assert.deepEqual(normalizeProductSizes(null), [])
  assert.deepEqual(normalizeProductSizes(undefined), [])
  assert.deepEqual(normalizeProductSizes([]), [])
})

test('normalizeProductSizes: rejects empty string', () => {
  assert.throws(() => normalizeProductSizes(''), /cannot be empty/i)
})

test('normalizeProductSizes: rejects malformed JSON string', () => {
  assert.throws(() => normalizeProductSizes('{not-json}'), /must be an array|must be a JSON array string/i)
})

test('normalizeProductSizes: rejects JSON object (not array)', () => {
  assert.throws(() => normalizeProductSizes('{"size":"M"}'), /must be an array/i)
})

test('normalizeProductSizes: rejects plain object', () => {
  assert.throws(() => normalizeProductSizes({}), /Invalid product sizes format/)
})

test('normalizeProductSizes: rejects number', () => {
  assert.throws(() => normalizeProductSizes(42), /Invalid product sizes format/)
})

test('normalizeProductSizes: rejects array with non-string values', () => {
  assert.throws(() => normalizeProductSizes([1, 2]), /Invalid product size at index/)
  assert.throws(() => normalizeProductSizes([null]), /Invalid product size at index/)
  assert.throws(() => normalizeProductSizes([true]), /Invalid product size at index/)
})

test('normalizeProductSizes: rejects oversized array', () => {
  assert.throws(() => normalizeProductSizes(Array.from({ length: 13 }, (_, i) => `S${i}`)), /cannot exceed 12/)
})

test('normalizeProductSizes: rejects size exceeding max length', () => {
  assert.throws(() => normalizeProductSizes(['valid', 'X'.repeat(31)]), /exceeds 30 characters/)
})

test('assertRequestedSize: rejects size not in available list', () => {
  assert.throws(() => assertRequestedSize('XL', ['S', 'M'], { sku: 'SKU-1' }), /Invalid size 'XL'/)
})

test('assertRequestedSize: rejects empty size when sizes are required', () => {
  assert.throws(() => assertRequestedSize('', ['S'], { sku: 'SKU-1' }), /Size is required/)
})

test('assertRequestedSize: accepts empty size when no sizes defined', () => {
  assert.equal(assertRequestedSize('', [], { sku: 'SKU-1' }), '')
})

// ── MockInvoiceProvider ────────────────────────────────────────────────────
test('mock invoice provider emits the required Spanish notices in XML and PDF', async () => {
  const provider = new MockInvoiceProvider()
  const order = { reference: 'WF-DEMO-1', total: '42.50' }
  const issued = await provider.issueInvoice({ order })
  const documents = await provider.getInvoiceDocuments({ order, issueResult: issued })
  const xml = documents.xml.toString('utf8')
  const pdf = documents.pdf.toString('utf8')

  for (const notice of ['DOCUMENTO DE PRUEBA', 'SIN VALIDEZ TRIBUTARIA', 'NO AUTORIZADO POR EL SRI']) {
    assert.match(xml, new RegExp(notice))
    assert.match(pdf, new RegExp(notice))
  }
  assert.match(xml, /NOT A TAX DOCUMENT/)
  assert.match(pdf, /NOT A TAX DOCUMENT/)
})

test('mock invoice provider XML is well-formed and contains order reference', async () => {
  const provider = new MockInvoiceProvider()
  const order = { reference: 'WF-TEST-99', total: '15.00' }
  const issued = await provider.issueInvoice({ order })
  const { xml } = await provider.getInvoiceDocuments({ order, issueResult: issued })
  const xmlStr = xml.toString('utf8')
  assert.match(xmlStr, /WF-TEST-99/)
  assert.match(xmlStr, /legal-document="false"/)
})

// ── DatilProvider ──────────────────────────────────────────────────────────
test('datil provider is injectable and never calls a real endpoint in tests', async () => {
  const calls = []
  const provider = new DatilProvider({
    baseUrl: 'https://datil.example.test',
    apiKey: 'test-api-key',
    issuerRuc: '1234567890001',
    timeoutMs: 2500,
    client: async (url, options) => {
      calls.push({ url, options })
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          status: 'AUTHORIZED',
          externalId: 'D-1',
          authorizationNumber: 'AUTH-1',
          xml: '<xml>ok</xml>',
          pdf: '<pdf>ok</pdf>',
        }),
      }
    },
    operations: {
      issueInvoice: { method: 'POST', path: '/invoices' },
      getInvoiceStatus: { method: 'GET', path: '/invoices/status' },
      getInvoiceDocuments: { method: 'GET', path: '/invoices/documents' },
      issueCreditNote: { method: 'POST', path: '/credit-notes' },
    },
    mappers: {
      issueInvoice: ({ order }) => ({ reference: order.reference, total: order.total }),
      getInvoiceStatus: ({ invoiceId }) => ({ invoiceId }),
      getInvoiceDocuments: ({ invoiceId }) => ({ invoiceId }),
      issueCreditNote: ({ invoiceId }) => ({ invoiceId }),
    },
  })

  const invoice = await provider.issueInvoice({ order: { reference: 'WF-1', total: '10.00' } })
  const status = await provider.getInvoiceStatus({ invoiceId: 1 })
  const documents = await provider.getInvoiceDocuments({ invoiceId: 1 })
  const credit = await provider.issueCreditNote({ invoiceId: 1 })

  assert.equal(calls.length, 4)
  assert.equal(invoice.status, 'AUTHORIZED')
  assert.equal(invoice.externalId, 'D-1')
  assert.equal(status.status, 'AUTHORIZED')
  assert.equal(Buffer.isBuffer(documents.xml), true)
  assert.equal(Buffer.isBuffer(documents.pdf), true)
  assert.equal(credit.status, 'AUTHORIZED')
  assert.ok(calls.every((call) => call.url.startsWith('https://datil.example.test/')))
})

test('datil provider blocks operations without explicit routes or mappers', async () => {
  const provider = new DatilProvider({ baseUrl: 'https://datil.example.test', apiKey: 'test-api-key', issuerRuc: '1234567890001', client: async () => ({ ok: true, status: 200, text: async () => '{}' }) })
  await assert.rejects(() => provider.issueInvoice({ order: { reference: 'WF-1' } }), DatilProviderError)
  await assert.rejects(() => provider.getInvoiceStatus({ invoiceId: 1 }), /blocked until the official route and method are explicitly configured/)
})

test('datil provider sanitizes error response and does not leak URLs', async () => {
  const provider = new DatilProvider({
    baseUrl: 'https://datil.example.test',
    apiKey: 'test-api-key',
    issuerRuc: '1234567890001',
    client: async () => ({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ message: 'Validation failed at https://datil.example.test/secret-path', code: 'VALIDATION_ERROR' }),
    }),
    operations: { issueInvoice: { method: 'POST', path: '/invoices' } },
    mappers: { issueInvoice: () => ({}) },
  })
  const err = await provider.issueInvoice({ order: { reference: 'WF-1' } }).catch((e) => e)
  assert.ok(err instanceof DatilProviderError)
  assert.doesNotMatch(err.details?.message || '', /https?:\/\//)
})

test('datil provider requires baseUrl, apiKey, and issuerRuc', async () => {
  const noBase = new DatilProvider({ apiKey: 'k', issuerRuc: 'r', client: async () => {} })
  await assert.rejects(() => noBase.issueInvoice({}), /DATIL_BASE_URL/)

  const noKey = new DatilProvider({ baseUrl: 'https://x.test', issuerRuc: 'r', client: async () => {} })
  await assert.rejects(() => noKey.issueInvoice({}), /DATIL_API_KEY|DATIL_OPERATION_NOT_CONFIGURED/)
})

// ── PayPhone mock gate ─────────────────────────────────────────────────────
test('PayPhone mock routes are gated by environment and production mode', async () => {
  const appEnabled = createApp({ prisma: prismaStub(), mockPayphoneServerEnabled: true, isProduction: false })
  const appDisabled = createApp({ prisma: prismaStub(), mockPayphoneServerEnabled: false, isProduction: false })
  const appProduction = createApp({ prisma: prismaStub(), mockPayphoneServerEnabled: true, isProduction: true })

  assert.equal((await request(appEnabled).post('/mock-payphone/button/Prepare').send({})).status, 200)
  assert.equal((await request(appDisabled).post('/mock-payphone/button/Prepare').send({})).status, 404)
  assert.equal((await request(appProduction).post('/mock-payphone/button/Prepare').send({})).status, 404)
})

test('frontend mock checkout route is excluded from production build settings', async () => {
  const source = await readFile(new URL('../../frontend/src/App.jsx', import.meta.url), 'utf8')
  assert.match(source, /import\.meta\.env\.MODE !== 'production'/)
  assert.match(source, /\/mock-payphone\/checkout/)
})
