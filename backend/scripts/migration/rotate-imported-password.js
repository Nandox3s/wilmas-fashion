import { Writable } from 'node:stream'
import { once } from 'node:events'
import { createInterface } from 'node:readline/promises'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import bcryptjs from 'bcryptjs'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: process.env.BACKEND_ENV_FILE || '/etc/wilmas-fashion/backend.env' })

if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_PRODUCTION_PASSWORD_ROTATION !== 'yes') {
  throw new Error('Production password rotation requires CONFIRM_PRODUCTION_PASSWORD_ROTATION=yes')
}
if (!process.stdin.isTTY) throw new Error('Password rotation requires an interactive TTY')

const output = new Writable({
  write(chunk, encoding, callback) {
    if (!output.muted) process.stdout.write(chunk, encoding)
    callback()
  },
})
output.muted = false
const prompt = createInterface({ input: process.stdin, output, terminal: true })

async function hidden(question) {
  process.stdout.write(question)
  output.muted = true
  try { return await prompt.question('') } finally {
    output.muted = false
    process.stdout.write('\n')
  }
}

const password = await hidden('New imported-user password (16+ characters): ')
const confirmation = await hidden('Confirm new password: ')
prompt.close()
if (password.length < 16) throw new Error('The new password must contain at least 16 characters')
if (password !== confirmation) throw new Error('Password confirmation does not match')

const migrationExport = resolve(process.env.MIGRATION_EXPORT || 'migration-exports/sqlite-export.json')
const data = JSON.parse(await readFile(migrationExport, 'utf8'))
if (!Array.isArray(data.users) || data.users.length !== 1) throw new Error('Expected exactly one imported user')
const email = String(data.users[0].email || '').trim().toLowerCase()
if (!email) throw new Error('Imported user email is missing')

const prisma = new PrismaClient()
try {
  await prisma.user.update({ where: { email }, data: { password: await bcryptjs.hash(password, 12) } })
  const { createApp } = await import('../../src/app.js')
  const server = createApp({ prisma }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const address = server.address()
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await response.json()
    if (response.status !== 200 || !body.token) throw new Error('Rotated password login verification failed')
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
} finally {
  await prisma.$disconnect()
}

console.log(JSON.stringify({ event: 'imported_password_rotated', users: 1, loginVerified: true }))
