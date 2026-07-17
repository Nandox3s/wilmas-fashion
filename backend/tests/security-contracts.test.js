import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/index.js', import.meta.url), 'utf8')

test('public registration forces USER and JWT contains email', () => {
  assert.match(source, /role: 'USER'/)
  assert.match(source, /userId: user\.id, email: user\.email, role: user\.role/)
  assert.doesNotMatch(source, /data:\s*\{[^}]*role:\s*req\.body\.role/s)
})

test('product permissions distinguish USER and ADMIN', () => {
  assert.match(source, /app\.post\('\/api\/products', requireAuth, authorizeRoles\('USER', 'ADMIN'\)/)
  assert.match(source, /app\.put\('\/api\/products\/:id', requireAuth, authorizeRoles\('USER', 'ADMIN'\)/)
  assert.match(source, /app\.delete\('\/api\/products\/:id', requireAuth, requireAdmin/)
})

test('quick price and stock routes are protected', () => {
  assert.match(source, /app\.patch\('\/api\/products\/:id\/price', requireAuth, authorizeRoles\('USER', 'ADMIN'\)/)
  assert.match(source, /app\.patch\('\/api\/products\/:id\/stock', requireAuth, authorizeRoles\('USER', 'ADMIN'\)/)
  assert.match(source, /price <= 0/)
  assert.match(source, /discount > 100/)
  assert.match(source, /stock < 0/)
})

test('role changes are admin-only and allow only current roles', () => {
  assert.match(source, /app\.patch\('\/api\/users\/:id\/role', requireAuth, requireAdmin/)
  assert.match(source, /\['USER', 'ADMIN'\]\.includes\(role\)/)
})

test('uploads enforce type and five megabyte limit', () => {
  assert.match(source, /5 \* 1024 \* 1024/)
  assert.match(source, /image\/jpeg/)
  assert.match(source, /authorizeRoles\('USER', 'ADMIN'\), upload\.single/)
})
