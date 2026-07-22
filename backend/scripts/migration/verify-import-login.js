import 'dotenv/config'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import { createApp } from '../../src/app.js'

const seedSource = await readFile(new URL('../../prisma/seed.js', import.meta.url), 'utf8')
const passwordMatch = seedSource.match(/bcrypt(?:js)?\.hash\(\s*(['"])(.*?)\1/)
if (!passwordMatch) throw new Error('Unable to locate the legacy demo password for a login-only verification')

const prisma = new PrismaClient()
const imported = await prisma.user.findFirst({ orderBy: { id: 'asc' }, select: { email: true } })
if (!imported) throw new Error('No imported user exists')
const server = createApp({ prisma }).listen(0, '127.0.0.1')
await once(server, 'listening')
let status = 0
let body = {}
try {
  const address = server.address()
  const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: imported.email, password: passwordMatch[2] }),
  })
  status = response.status
  body = await response.json()
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await prisma.$disconnect()
}
console.log(JSON.stringify({ event: 'imported_login_verified', status, authenticated: Boolean(body.token), role: body.user?.role }))
if (status !== 200 || !body.token) process.exitCode = 1
