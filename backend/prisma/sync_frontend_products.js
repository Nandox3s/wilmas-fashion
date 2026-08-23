import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { catalogProducts } from './catalogProducts.js'

dotenv.config()
const prisma = new PrismaClient()

async function main() {
  for (const product of catalogProducts) {
    const data = { discount: 0, onOffer: false, isActive: true, ...product }
    await prisma.product.upsert({ where: { sku: product.sku }, update: data, create: data })
    console.log('Upserted', product.sku)
  }
  console.log('Sync finished: upserted', catalogProducts.length, 'products')
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
