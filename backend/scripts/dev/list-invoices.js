import { prisma } from '../../src/config/prisma.js'
import { ensureLocalOnly } from './_common.js'

ensureLocalOnly('list-invoices')

async function main() {
  const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, orderId: true, provider: true, status: true, accessKey: true, authorizationNumber: true, issuedAt: true, authorizedAt: true, createdAt: true, order: { select: { reference: true, status: true, customerEmail: true } } } })
  console.log(JSON.stringify(invoices.map((invoice) => ({ ...invoice, customerEmail: invoice.order.customerEmail.replace(/(^.).*(@.*$)/, '$1***$2') })), null, 2))
  await prisma.$disconnect()
}

main().catch((error) => { console.error(error.message); process.exit(1) })
