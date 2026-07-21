import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const backendDir = resolve(scriptDir, '../..')
const [backupArgument, command = 'verify'] = process.argv.slice(2)
if (!backupArgument) throw new Error('Usage: node verify-backup.js <backup-directory> [verify|restore]')
const backupDir = resolve(backupArgument)

async function exists(path) {
  try { await stat(path); return true } catch { return false }
}

const manifest = JSON.parse(await readFile(join(backupDir, 'manifest.json'), 'utf8'))
const databaseFile = join(backupDir, manifest.database.file)
const digest = createHash('sha256').update(await readFile(databaseFile)).digest('hex')
if (digest !== manifest.database.sha256) throw new Error('Backup database checksum mismatch')
if (manifest.uploads.included && !(await exists(join(backupDir, manifest.uploads.directory)))) {
  throw new Error('Uploads directory declared in manifest is missing')
}

if (command === 'restore') {
  if (process.env.CONFIRM_RESTORE !== 'yes') throw new Error('Set CONFIRM_RESTORE=yes to restore into explicit RESTORE_DB and RESTORE_UPLOADS paths')
  if (!process.env.RESTORE_DB) throw new Error('RESTORE_DB is required')
  const restoreDb = resolve(process.env.RESTORE_DB)
  await mkdir(dirname(restoreDb), { recursive: true })
  await cp(databaseFile, restoreDb, { force: false })
  if (manifest.uploads.included && process.env.RESTORE_UPLOADS) {
    await cp(join(backupDir, manifest.uploads.directory), resolve(process.env.RESTORE_UPLOADS), { recursive: true, force: false })
  }
  console.log(JSON.stringify({ event: 'backup_restored', database: restoreDb }))
} else if (command === 'verify') {
  console.log(JSON.stringify({ event: 'backup_verified', path: backupDir, databaseSha256: digest }))
} else {
  throw new Error(`Unknown command: ${command}`)
}
