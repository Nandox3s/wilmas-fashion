import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { detectedImageType, IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../src/utils/fileValidation.js'

const source = resolve(process.env.UPLOADS_SOURCE || 'uploads')
const bucket = process.env.S3_PRODUCTS_BUCKET
if (!bucket) throw new Error('S3_PRODUCTS_BUCKET is required')
const apply = process.env.CONFIRM_UPLOAD_MIGRATION === 'yes'
const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })
const names = await readdir(source, { withFileTypes: true }).catch(() => [])
const manifest = []
for (const entry of names.filter((item) => item.isFile())) {
  const body = await readFile(resolve(source, entry.name))
  const mimeType = detectedImageType(body.subarray(0, 16)); const extension = extname(entry.name).toLowerCase()
  if (!mimeType || !IMAGE_TYPES[mimeType].includes(extension) || body.length > MAX_IMAGE_BYTES) { manifest.push({ source: entry.name, status: 'rejected' }); continue }
  const sha256 = createHash('sha256').update(body).digest('hex'); const key = `products/migrated/${sha256}${extension}`
  if (apply) await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: mimeType, ServerSideEncryption: 'AES256', Metadata: { original: basename(entry.name) } }))
  manifest.push({ source: entry.name, key, bytes: body.length, sha256, status: apply ? 'uploaded' : 'dry-run' })
}
const output = resolve(process.env.UPLOADS_MANIFEST || 'migration-exports/uploads-s3-manifest.json')
await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), bucket, apply, files: manifest }, null, 2)}\n`, { mode: 0o600 })
console.log(JSON.stringify({ event: 'uploads_migration_complete', apply, accepted: manifest.filter((item) => item.status !== 'rejected').length, rejected: manifest.filter((item) => item.status === 'rejected').length }))
