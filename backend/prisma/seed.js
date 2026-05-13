import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcryptjs.hash('admin123', 10);
  await prisma.user.create({
    data: { name: 'Admin', email: 'admin@wilmas.com', password: adminHash, role: 'ADMIN' }
  });

  const products = [
    { name: 'Camiseta Negra', sku: 'CAM001', category: 'Hombre', size: 'M', color: 'Negro', price: 29.99, stock: 50, onOffer: true, discount: 10 },
    { name: 'Jeans Azul', sku: 'JEA001', category: 'Hombre', size: 'L', color: 'Azul', price: 59.99, stock: 30 },
    { name: 'Vestido Rojo', sku: 'VES001', category: 'Mujer', size: 'S', color: 'Rojo', price: 79.99, stock: 20, onOffer: true, discount: 15 },
    { name: 'Falda Negra', sku: 'FAL001', category: 'Mujer', size: 'M', color: 'Negro', price: 49.99, stock: 25 },
    { name: 'Cinturón Cuero', sku: 'CIN001', category: 'Accesorios', size: 'Único', color: 'Café', price: 39.99, stock: 40 },
    { name: 'Sombrero', sku: 'SOM001', category: 'Accesorios', size: 'Único', color: 'Negro', price: 34.99, stock: 15, onOffer: true, discount: 20 }
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  console.log('✅ Database seeded!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
