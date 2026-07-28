import { spawnSync } from 'node:child_process'
import { loadManagedSecrets } from '../../src/config/managedSecrets.js'

if (process.env.CONFIRM_RDS_MIGRATION !== 'yes') throw new Error('Set CONFIRM_RDS_MIGRATION=yes for this controlled one-time operation')
await loadManagedSecrets()
if (!process.env.DATABASE_URL?.startsWith('postgresql://')) throw new Error('A managed PostgreSQL DATABASE_URL is required')
const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'migrate', 'deploy'], { env: process.env, stdio: 'inherit' })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
