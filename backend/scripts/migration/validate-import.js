import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const data = JSON.parse(await readFile(resolve(process.env.MIGRATION_EXPORT || 'migration-exports/sqlite-export.json'), 'utf8'))
const prisma = new PrismaClient()
const [users, products, sales, productRows, saleTotal] = await Promise.all([prisma.user.count(), prisma.product.count(), prisma.sale.count(), prisma.product.findMany({ select: { sku: true, stock: true } }), prisma.sale.aggregate({ _sum: { total: true } })])
const sourceStock = new Map(data.products.map((row) => [String(row.sku).toUpperCase(), row.stock])); const stockDifferences = productRows.filter((row) => sourceStock.get(row.sku) !== row.stock).map((row) => row.sku)
const sourceTotal = data.sales.reduce((sum, row) => sum + Math.round(Number(row.total) * 100), 0) / 100
const report = { valid: users === data.users.length && products === data.products.length && sales === data.sales.length && stockDifferences.length === 0 && Number(saleTotal._sum.total || 0) === sourceTotal, source: { users: data.users.length, products: data.products.length, sales: data.sales.length, totalSales: sourceTotal }, target: { users, products, sales, totalSales: Number(saleTotal._sum.total || 0) }, stockDifferences }
console.log(JSON.stringify(report)); await prisma.$disconnect(); if (!report.valid) process.exitCode = 1
