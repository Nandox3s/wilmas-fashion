import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

if (process.env.CONFIRM_RDS_MIGRATION !== 'yes') throw new Error('Set CONFIRM_RDS_MIGRATION=yes only after backup and tunnel verification')
const secretArn = process.env.RDS_SECRET_ARN
if (!secretArn) throw new Error('RDS_SECRET_ARN is required')
const localPort = Number(process.env.RDS_TUNNEL_PORT || 55432)
const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' })
const response = await client.send(new GetSecretValueCommand({ SecretId: secretArn }))
const secret = JSON.parse(response.SecretString || '{}')
if (!secret.username || !secret.password) throw new Error('RDS managed secret is incomplete')
const database = process.env.DATABASE_NAME || 'wilmas_fashion'
const databaseUrl = `postgresql://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@127.0.0.1:${localPort}/${encodeURIComponent(database)}?schema=public&sslmode=require`
const env = { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'development' }
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const migrate = spawnSync(command, ['prisma', 'migrate', 'deploy'], { env, stdio: 'inherit' })
if (migrate.status !== 0) process.exit(migrate.status ?? 1)
const importer = spawnSync(process.execPath, ['scripts/migration/import-postgresql-data.js'], { env, stdio: 'inherit' })
if (importer.status !== 0) process.exit(importer.status ?? 1)
const validate = spawnSync(process.execPath, ['scripts/migration/validate-import.js'], { env, stdio: 'inherit' })
process.exitCode = validate.status ?? 1
