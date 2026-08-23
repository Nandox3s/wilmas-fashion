import test from 'node:test'
import assert from 'node:assert/strict'
import { persistSession, sessionPayload } from '../src/services/apiClient.js'

function token(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode(payload)}.`
}

test('social login uses the existing session storage and survives a page reload', () => {
  const values = new Map()
  global.window = {
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  }
  const jwt = token({ userId: 15, email: 'social@example.com', role: 'USER', exp: Math.floor(Date.now() / 1000) + 3600 })
  persistSession({ token: jwt, user: { id: 15, email: 'social@example.com', role: 'USER' } })
  assert.equal(sessionPayload().userId, 15)
  assert.equal(window.localStorage.getItem('role'), 'USER')
})
