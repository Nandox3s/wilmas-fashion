import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

const testUrl = process.env.DATABASE_URL_TEST
if (!testUrl) throw new Error('DATABASE_URL_TEST is required to run tests')

let databaseName
try {
  const parsed = new URL(testUrl)
  if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) throw new Error('unsupported protocol')
  databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
} catch {
  throw new Error('DATABASE_URL_TEST must be a valid PostgreSQL URL')
}

if (!databaseName.endsWith('_test')) {
  throw new Error(`Refusing to run tests: database name must end in _test (received ${databaseName || '<empty>'})`)
}

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = testUrl

const testFiles = readdirSync('tests').filter((name) => name.endsWith('.test.js')).map((name) => `tests/${name}`)
const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  env: process.env,
  stdio: 'inherit',
})

if (result.error) throw result.error
process.exitCode = result.status ?? 1
