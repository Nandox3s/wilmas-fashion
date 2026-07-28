import { DatabaseSync } from 'node:sqlite'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const source = resolve(process.env.SQLITE_SOURCE || 'prisma/dev.db')
const output = resolve(process.env.MIGRATION_EXPORT || 'migration-exports/sqlite-export.json')
const db = new DatabaseSync(source, { open: true, readOnly: true })
const read = (table) => db.prepare(`SELECT * FROM "${table}" ORDER BY id`).all()
const payload = { formatVersion: 1, exportedAt: new Date().toISOString(), users: read('User'), products: read('Product'), sales: read('Sale') }
db.close()
await mkdir(dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
const digest = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
console.log(JSON.stringify({ event: 'sqlite_exported', users: payload.users.length, products: payload.products.length, sales: payload.sales.length, sha256: digest, output }))
