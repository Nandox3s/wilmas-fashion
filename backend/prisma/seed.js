import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { catalogProducts, legacyProductWhere } from './catalogProducts.js'

dotenv.config()
const prisma = new PrismaClient()

async function cleanLegacyProducts() {
  const legacy = await prisma.product.findMany({ where: legacyProductWhere, include: { _count: { select: { orderItems: true, sales: true, reservations: true } } } })
  let deleted = 0
  let archived = 0
  for (const product of legacy) {
    const hasHistory = product._count.orderItems + product._count.sales + product._count.reservations > 0
    if (hasHistory) {
      await prisma.product.update({ where: { id: product.id }, data: { isActive: false } })
      archived += 1
    } else {
      await prisma.product.delete({ where: { id: product.id } })
      deleted += 1
    }
  }
  return { deleted, archived }
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_PRODUCTION_CATALOG_SEED !== 'yes') {
    throw new Error('Production catalog seed requires CONFIRM_PRODUCTION_CATALOG_SEED=yes')
  }
  const cleanup = await cleanLegacyProducts()
  for (const product of catalogProducts) {
    const data = { discount: 0, onOffer: false, isActive: true, ...product }
    await prisma.product.upsert({ where: { sku: product.sku }, update: data, create: data })
  }
  console.log(JSON.stringify({ catalogUpserted: catalogProducts.length, ...cleanup }))
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
