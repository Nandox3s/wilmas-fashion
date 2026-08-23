import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const frontendRoot = process.env.FRONTEND_DIST_DIR

try {
  const [users, admins, orders, invoices, authProviders, products, activeProducts, inactiveProducts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.order.count(),
    prisma.invoice.count(),
    prisma.userAuthProvider.count(),
    prisma.product.count(),
    prisma.product.findMany({ where: { isActive: true }, select: { image: true, sku: true } }),
    prisma.product.count({ where: { isActive: false } }),
  ])

  let imagesPresent = null
  const invalidImages = activeProducts.filter(({ image }) => !image?.startsWith('/img_wf/'))
  if (frontendRoot) {
    const checks = await Promise.all(activeProducts.map(async ({ image }) => {
      if (!image?.startsWith('/img_wf/')) return false
      try { await access(resolve(frontendRoot, `.${image}`)); return true } catch { return false }
    }))
    imagesPresent = checks.filter(Boolean).length
  }

  const result = {
    valid: products === 36 && activeProducts.length === 17 && inactiveProducts === 19 && invalidImages.length === 0 && (imagesPresent === null || imagesPresent === 17),
    users,
    admins,
    orders,
    invoices,
    authProviders,
    products,
    activeProducts: activeProducts.length,
    inactiveProducts,
    imagesPresent,
    invalidImagePaths: invalidImages.length,
  }
  console.log(JSON.stringify(result))
  if (!result.valid) process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
