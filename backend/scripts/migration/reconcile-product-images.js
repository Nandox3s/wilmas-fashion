import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const manifest = JSON.parse(await readFile(resolve(process.env.UPLOADS_MANIFEST || 'migration-exports/uploads-s3-manifest.json'), 'utf8'))
const keys = new Map(manifest.files.filter((item) => item.status === 'uploaded').map((item) => [item.source.toLowerCase(), item.key]))
const prisma = new PrismaClient(); const products = await prisma.product.findMany({ where: { image: { not: null } }, select: { id: true, image: true } })
const changes = products.map((product) => ({ id: product.id, from: product.image, to: keys.get(basename(product.image).toLowerCase()) })).filter((item) => item.to)
if (process.env.CONFIRM_IMAGE_RECONCILIATION === 'yes') for (const change of changes) await prisma.product.update({ where: { id: change.id }, data: { image: change.to } })
console.log(JSON.stringify({ event: 'product_images_reconciled', candidates: products.length, matched: changes.length, applied: process.env.CONFIRM_IMAGE_RECONCILIATION === 'yes' }))
await prisma.$disconnect()
