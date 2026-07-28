import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const input = resolve(process.env.MIGRATION_EXPORT || 'migration-exports/sqlite-export.json')
const data = JSON.parse(await readFile(input, 'utf8'))
const duplicates = (rows, key) => { const seen = new Set(); return rows.map((row) => String(row[key]).trim().toLowerCase()).filter((value) => seen.size === seen.add(value).size) }
const errors = []
if (data.formatVersion !== 1) errors.push('Unsupported export format')
const duplicateEmails = duplicates(data.users, 'email'); const duplicateSkus = duplicates(data.products, 'sku')
if (duplicateEmails.length) errors.push(`Duplicate emails: ${duplicateEmails.length}`)
if (duplicateSkus.length) errors.push(`Duplicate SKUs: ${duplicateSkus.length}`)
const invalidMoney = [...data.products.filter((row) => !Number.isFinite(Number(row.price))), ...data.sales.filter((row) => !Number.isFinite(Number(row.total)))]
if (invalidMoney.length) errors.push(`Invalid monetary rows: ${invalidMoney.length}`)
const report = { valid: errors.length === 0, counts: { users: data.users.length, products: data.products.length, sales: data.sales.length }, duplicateEmails: duplicateEmails.length, duplicateSkus: duplicateSkus.length, invalidMoney: invalidMoney.length, totalSales: data.sales.reduce((sum, row) => sum + Math.round(Number(row.total) * 100), 0) / 100, errors }
console.log(JSON.stringify(report))
if (!report.valid) process.exitCode = 1
