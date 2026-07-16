import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.product.findUnique({ where: { sku: 'PAL001' } }).catch(()=>null)
  if (existing) {
    console.log('Product PAL001 already exists:', existing.id)
    return
  }

  const p = await prisma.product.create({
    data: {
      name: 'Palazo',
      sku: 'PAL001',
      brand: 'Wilmas',
      category: 'Mujer',
      sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
      color: 'Rojo',
      price: 12.0,
      stock: 8,
      onOffer: false,
      image: null
    }
  })

  console.log('Created product', p.id)
}

main().catch(err => { console.error(err); process.exit(1) }).finally(() => prisma.$disconnect())
