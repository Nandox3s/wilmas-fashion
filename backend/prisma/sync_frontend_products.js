import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  // Resolve frontend data module path relative to backend folder
  const frontendDataPath = resolve(process.cwd(), '../frontend/src/data/products.js')

  // Dynamic import of ES module file (use file:// URL)
  const { availableProducts } = await import('file://' + frontendDataPath.replace(/\\/g, '/'))

  if (!availableProducts || !availableProducts.length) {
    console.log('No availableProducts found in frontend data. Nothing to sync.')
    return
  }

  for (const p of availableProducts) {
    const sku = (p.sku || String(p.id || p.name).replace(/\s+/g, '_')).toUpperCase()
    const sizes = Array.isArray(p.sizes)
      ? p.sizes
      : String(p.size || 'Único').split(',')
    const productData = {
      name: p.name,
      brand: p.brand || 'Wilmas',
      category: p.category || 'Uncategorized',
      sizes: JSON.stringify([...new Set(sizes.map((size) => String(size).trim()).filter(Boolean))]),
      color: p.color || 'N/A',
      price: Number(p.price) || 0,
      discount: Number(p.discount) || 0,
      stock: Number(p.stock) || 0,
      onOffer: !!p.onOffer,
      image: p.image || (p.file ? `/img_wf/${p.file}` : null)
    }

    await prisma.product.upsert({
      where: { sku },
      update: productData,
      create: { sku, ...productData }
    })

    console.log('Upserted', sku)
  }

  console.log('Sync finished: upserted', availableProducts.length, 'products')
}

main()
  .catch((e)=>{ console.error(e); process.exit(1) })
  .finally(()=> prisma.$disconnect())
