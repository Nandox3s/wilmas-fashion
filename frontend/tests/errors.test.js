import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { API_TIMEOUT_MS, friendlyApiError } from '../src/services/apiClient.js'

test('API client uses a finite timeout and friendly network messages', () => {
  assert.equal(API_TIMEOUT_MS, 15_000)
  assert.equal(friendlyApiError({ code: 'ERR_NETWORK' }), 'No pudimos conectar con el servidor. Revisa tu conexión.')
  assert.match(friendlyApiError({ code: 'ECONNABORTED', message: 'timeout' }), /tardó demasiado/)
})

test('API client normalizes permission, server and stock errors', () => {
  assert.match(friendlyApiError({ response: { status: 403, data: {} } }), /permisos/)
  assert.match(friendlyApiError({ response: { status: 500, data: { message: 'SQL secret' } } }), /problema inesperado/)
  assert.match(friendlyApiError({ response: { status: 409, data: { code: 'INSUFFICIENT_STOCK' } } }), /stock/)
})

test('global React Error Boundary provides recovery without exposing a stack', async () => {
  const source = await readFile(new URL('../src/components/ErrorBoundary.jsx', import.meta.url), 'utf8')
  assert.match(source, /Algo salió mal/)
  assert.match(source, /Reintentar/)
  assert.match(source, /Volver al inicio/)
  assert.doesNotMatch(source, /error\.stack/)
})

test('catalog and invoice errors expose retry/loading states', async () => {
  const [catalog, order, adminOrder] = await Promise.all([
    readFile(new URL('../src/pages/Catalog.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/OrderDetail.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/AdminOrderDetail.jsx', import.meta.url), 'utf8'),
  ])
  assert.match(catalog, /Reintentar/)
  assert.match(order, /Descargando factura/)
  assert.match(adminOrder, /Descargando factura/)
})
