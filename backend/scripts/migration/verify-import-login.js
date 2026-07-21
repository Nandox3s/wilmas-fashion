import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { createApp } from '../../src/app.js'

const seedSource = await readFile(new URL('../../prisma/seed.js', import.meta.url), 'utf8')
const passwordMatch = seedSource.match(/bcrypt(?:js)?\.hash\(\s*(['"])(.*?)\1/)
if (!passwordMatch) throw new Error('Unable to locate the legacy demo password for a login-only verification')

const prisma = new PrismaClient()
const imported = await prisma.user.findFirst({ orderBy: { id: 'asc' }, select: { email: true } })
if (!imported) throw new Error('No imported user exists')
const response = await request(createApp({ prisma })).post('/api/auth/login').send({ email: imported.email, password: passwordMatch[2] })
console.log(JSON.stringify({ event: 'imported_login_verified', status: response.status, authenticated: Boolean(response.body.token), role: response.body.user?.role }))
await prisma.$disconnect()
if (response.status !== 200 || !response.body.token) process.exitCode = 1
