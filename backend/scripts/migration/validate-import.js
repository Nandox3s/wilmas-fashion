import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const data = JSON.parse(await readFile(resolve(process.env.MIGRATION_EXPORT || 'migration-exports/sqlite-export.json'), 'utf8'))
const prisma = new PrismaClient()
const [users, products, sales, userRows, productRows, saleRows, saleTotal] = await Promise.all([
  prisma.user.count(), prisma.product.count(), prisma.sale.count(),
  prisma.user.findMany({ select: { email: true, name: true, role: true, password: true } }),
  prisma.product.findMany({ select: { sku: true, name: true, brand: true, category: true, sizes: true, color: true, price: true, discount: true, onOffer: true, stock: true } }),
  prisma.sale.findMany({ select: { id: true, userId: true, productId: true, quantity: true, total: true, user: { select: { id: true } }, product: { select: { id: true } } } }),
  prisma.sale.aggregate({ _sum: { total: true } }),
])
const sourceUsers = new Map(data.users.map((row) => [String(row.email).trim().toLowerCase(), row]))
const sourceProducts = new Map(data.products.map((row) => [String(row.sku).trim().toUpperCase(), row]))
const uniqueEmails = new Set(userRows.map((row) => row.email.toLowerCase())).size === userRows.length
const uniqueSkus = new Set(productRows.map((row) => row.sku.toUpperCase())).size === productRows.length
const userDifferences = userRows.filter((row) => {
  const source = sourceUsers.get(row.email.toLowerCase())
  return !source || row.name !== source.name || row.role !== (source.role === 'ADMIN' ? 'ADMIN' : 'USER') || row.password !== source.password
}).length
const passwordHashesValid = userRows.every((row) => /^\$2[aby]\$\d{2}\$/.test(row.password))
const productDifferences = productRows.filter((row) => {
  const source = sourceProducts.get(row.sku.toUpperCase())
  if (!source) return true
  let sizes
  try { sizes = JSON.parse(source.sizes || '[]') } catch { return true }
  return row.name !== source.name || row.brand !== source.brand || row.category !== source.category || JSON.stringify(row.sizes) !== JSON.stringify(sizes) || row.color !== source.color || Number(row.price) !== Number(source.price) || Number(row.discount) !== Number(source.discount || 0) || row.onOffer !== Boolean(source.onOffer) || row.stock !== source.stock
}).length
const orphanSales = saleRows.filter((row) => !row.user || !row.product).length
const sourceTotal = data.sales.reduce((sum, row) => sum + Math.round(Number(row.total) * 100), 0) / 100
const checks = { uniqueEmails, uniqueSkus, userDifferences, productDifferences, passwordHashesValid, orphanSales, descriptions: 'not-applicable-field-not-present-in-source-or-target' }
const report = { valid: users === data.users.length && products === data.products.length && sales === data.sales.length && uniqueEmails && uniqueSkus && userDifferences === 0 && productDifferences === 0 && passwordHashesValid && orphanSales === 0 && Number(saleTotal._sum.total || 0) === sourceTotal, source: { users: data.users.length, products: data.products.length, sales: data.sales.length, totalSales: sourceTotal }, target: { users, products, sales, totalSales: Number(saleTotal._sum.total || 0) }, checks }
console.log(JSON.stringify(report)); await prisma.$disconnect(); if (!report.valid) process.exitCode = 1
