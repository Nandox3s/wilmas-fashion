import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'

const manifest = JSON.parse(await readFile(resolve(process.env.UPLOADS_MANIFEST || 'migration-exports/uploads-s3-manifest.json'), 'utf8'))
const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' }); const failures = []
for (const file of manifest.files.filter((item) => item.status === 'uploaded')) {
  try { const head = await client.send(new HeadObjectCommand({ Bucket: manifest.bucket, Key: file.key })); if (head.ContentLength !== file.bytes) failures.push(file.source) }
  catch { failures.push(file.source) }
}
console.log(JSON.stringify({ event: 's3_uploads_validated', checked: manifest.files.filter((item) => item.status === 'uploaded').length, failures: failures.length }))
if (failures.length) process.exitCode = 1
