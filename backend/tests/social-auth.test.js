import test from 'node:test'
import assert from 'node:assert/strict'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import request from 'supertest'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters'
const { createApp } = await import('../src/app.js')

const validProfiles = {
  google: { providerId: 'google-123', email: 'social@example.com', name: 'Social User', avatar: 'https://example.com/avatar.jpg' },
  facebook: { providerId: 'facebook-123', email: 'facebook@example.com', name: 'Facebook User', avatar: 'https://example.com/fb.jpg' },
}

function setup(seed = []) {
  const users = seed.map((user) => ({ avatar: null, ...user }))
  const identities = []
  const prisma = {
    $queryRaw: async () => [],
    $transaction: async (callback) => callback(prisma),
    user: {
      findUnique: async ({ where }) => users.find((user) => user.id === where.id || user.email === where.email) || null,
      create: async ({ data }) => { const user = { id: users.length + 1, createdAt: new Date(), updatedAt: new Date(), ...data }; users.push(user); return user },
      update: async ({ where, data }) => Object.assign(users.find((user) => user.id === where.id), data),
      findMany: async () => users,
      count: async () => users.length,
    },
    userAuthProvider: {
      findUnique: async ({ where }) => {
        const key = where.provider_providerId
        const identity = identities.find((item) => item.provider === key.provider && item.providerId === key.providerId)
        return identity ? { ...identity, user: users.find((user) => user.id === identity.userId) } : null
      },
      create: async ({ data }) => {
        if (identities.some((item) => item.provider === data.provider && (item.providerId === data.providerId || item.userId === data.userId))) {
          throw Object.assign(new Error('duplicate'), { code: 'P2002' })
        }
        const identity = { id: identities.length + 1, ...data }
        identities.push(identity)
        return identity
      },
    },
    product: { findMany: async () => [], count: async () => 0 },
    sale: { count: async () => 0, aggregate: async () => ({ _sum: { total: 0 } }), findMany: async () => [] },
  }
  const googleAuth = { verify: async (token) => { if (token !== 'valid-google') throw Object.assign(new Error('invalid'), { status: 401 }); return validProfiles.google } }
  const facebookAuth = { verify: async (token) => { if (token !== 'valid-facebook') throw Object.assign(new Error('invalid'), { status: 401 }); return validProfiles.facebook } }
  const app = createApp({ prisma, providerOverrides: { googleAuth, facebookAuth } })
  return { app, users, identities }
}

test('new Google user receives USER role and Wilmas JWT', async () => {
  const { app, users } = setup()
  const response = await request(app).post('/api/auth/google').send({ credential: 'valid-google', role: 'ADMIN' })
  assert.equal(response.status, 200)
  assert.equal(users.length, 1)
  assert.equal(response.body.user.role, 'USER')
  assert.equal(jwt.verify(response.body.token, process.env.JWT_SECRET).userId, users[0].id)
})

test('new Facebook user receives USER role and Wilmas JWT', async () => {
  const { app, users } = setup()
  const response = await request(app).post('/api/auth/facebook').send({ accessToken: 'valid-facebook', role: 'ADMIN' })
  assert.equal(response.status, 200)
  assert.equal(users.length, 1)
  assert.equal(response.body.user.role, 'USER')
  assert.ok(response.body.token)
})

test('Google links an existing local account by email without duplication', async () => {
  const local = { id: 7, name: 'Local', email: validProfiles.google.email, password: bcryptjs.hashSync('password123', 4), role: 'USER' }
  const { app, users, identities } = setup([local])
  const response = await request(app).post('/api/auth/google').send({ credential: 'valid-google' })
  assert.equal(response.body.user.id, 7)
  assert.equal(users.length, 1)
  assert.equal(identities[0].userId, 7)
})

test('Google preserves an existing ADMIN role', async () => {
  const admin = { id: 9, name: 'Admin', email: validProfiles.google.email, password: null, role: 'ADMIN' }
  const { app } = setup([admin])
  const response = await request(app).post('/api/auth/google').send({ credential: 'valid-google', role: 'USER' })
  assert.equal(response.body.user.role, 'ADMIN')
})

test('fake Google token is rejected', async () => {
  const { app } = setup()
  assert.equal((await request(app).post('/api/auth/google').send({ credential: 'fake' })).status, 401)
})

test('fake Facebook token is rejected', async () => {
  const { app } = setup()
  assert.equal((await request(app).post('/api/auth/facebook').send({ accessToken: 'fake' })).status, 401)
})

test('password login for a social-only account returns a controlled response', async () => {
  const social = { id: 4, name: 'Social', email: 'only-social@example.com', password: null, role: 'USER' }
  const { app } = setup([social])
  const response = await request(app).post('/api/auth/login').send({ email: social.email, password: 'password123' })
  assert.equal(response.status, 401)
  assert.equal(response.body.code, 'SOCIAL_LOGIN_REQUIRED')
})
