import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const backendDir = resolve(scriptDir, '../..')
const sourceDb = resolve(process.env.SQLITE_SOURCE || join(backendDir, 'prisma/dev.db'))
const sourceUploads = resolve(process.env.UPLOADS_SOURCE || join(backendDir, 'uploads'))
const backupRoot = resolve(process.env.BACKUP_DIR || join(backendDir, 'backups'))
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const destination = join(backupRoot, `backup-${stamp}`)

async function exists(path) {
  try { await stat(path); return true } catch { return false }
}

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

if (!(await exists(sourceDb))) throw new Error(`SQLite source not found: ${sourceDb}`)
await mkdir(destination, { recursive: true })
const databaseFile = join(destination, 'dev.backup.db')
await cp(sourceDb, databaseFile, { force: false })

const uploadsDirectory = join(destination, 'uploads')
if (await exists(sourceUploads)) await cp(sourceUploads, uploadsDirectory, { recursive: true, force: false })

const manifest = {
  formatVersion: 1,
  createdAt: new Date().toISOString(),
  database: { file: basename(databaseFile), sha256: await sha256(databaseFile) },
  uploads: { directory: 'uploads', included: await exists(sourceUploads) },
}
await writeFile(join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ event: 'backup_created', path: destination, databaseSha256: manifest.database.sha256 }))
