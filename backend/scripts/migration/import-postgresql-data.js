import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL?.startsWith('postgresql://') && !process.env.DATABASE_URL?.startsWith('postgres://')) throw new Error('DATABASE_URL must explicitly target PostgreSQL')
if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_PRODUCTION_IMPORT !== 'yes') throw new Error('Production import requires CONFIRM_PRODUCTION_IMPORT=yes')
const input = resolve(process.env.MIGRATION_EXPORT || 'migration-exports/sqlite-export.json')
const reportPath = resolve(process.env.MIGRATION_REPORT || 'migration-exports/import-report.json')
const data = JSON.parse(await readFile(input, 'utf8')); const prisma = new PrismaClient(); const rejected = []
const safe = async (type, id, operation) => { try { await operation() } catch (error) { rejected.push({ type, id, code: error.code || 'ERROR', message: String(error.message).split('\n')[0] }) } }
for (const row of data.users) await safe('user', row.id, () => prisma.user.upsert({ where: { email: String(row.email).trim().toLowerCase() }, update: { name: row.name, password: row.password, role: row.role === 'ADMIN' ? 'ADMIN' : 'USER' }, create: { id: row.id, name: row.name, email: String(row.email).trim().toLowerCase(), password: row.password, role: row.role === 'ADMIN' ? 'ADMIN' : 'USER', createdAt: row.createdAt, updatedAt: row.updatedAt } }))
for (const row of data.products) await safe('product', row.id, () => prisma.product.upsert({ where: { sku: String(row.sku).trim().toUpperCase() }, update: { name: row.name, brand: row.brand, category: row.category, sizes: JSON.parse(row.sizes || '[]'), color: row.color, price: Number(row.price).toFixed(2), discount: Number(row.discount || 0).toFixed(2), onOffer: Boolean(row.onOffer), stock: row.stock, image: row.image }, create: { id: row.id, name: row.name, sku: String(row.sku).trim().toUpperCase(), brand: row.brand, category: row.category, sizes: JSON.parse(row.sizes || '[]'), color: row.color, price: Number(row.price).toFixed(2), discount: Number(row.discount || 0).toFixed(2), onOffer: Boolean(row.onOffer), stock: row.stock, image: row.image, createdAt: row.createdAt, updatedAt: row.updatedAt } }))
for (const row of data.sales) await safe('sale', row.id, () => prisma.sale.upsert({ where: { id: row.id }, update: { userId: row.userId, productId: row.productId, quantity: row.quantity, total: Number(row.total).toFixed(2) }, create: { id: row.id, userId: row.userId, productId: row.productId, quantity: row.quantity, total: Number(row.total).toFixed(2), createdAt: row.createdAt } }))
await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE(MAX(id), 1)) FROM "User"`)
await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Product"', 'id'), COALESCE(MAX(id), 1)) FROM "Product"`)
await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Sale"', 'id'), COALESCE(MAX(id), 1)) FROM "Sale"`)
const report = { completedAt: new Date().toISOString(), inputCounts: { users: data.users.length, products: data.products.length, sales: data.sales.length }, rejected }
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'w', mode: 0o600 })
console.log(JSON.stringify({ event: 'postgres_import_completed', ...report.inputCounts, rejected: rejected.length, report: reportPath }))
await prisma.$disconnect()
if (rejected.length) process.exitCode = 1
