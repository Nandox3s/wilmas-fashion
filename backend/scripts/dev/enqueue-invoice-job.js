import { prisma } from '../../src/config/prisma.js'
import { ensureLocalOnly } from './_common.js'

ensureLocalOnly('enqueue-invoice-job')

async function main() {
  const invoice = await prisma.invoice.findFirst({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, select: { id: true, orderId: true } })
  if (!invoice) {
    console.log('No PENDING invoices found')
    await prisma.$disconnect()
    process.exit(0)
  }

  const job = await prisma.job.create({
    data: {
      type: 'ISSUE_INVOICE',
      aggregateId: `invoice-${invoice.id}`,
      payload: { invoiceId: invoice.id, orderId: invoice.orderId },
      status: 'PENDING',
    },
    select: { id: true, type: true, status: true, aggregateId: true },
  })

  console.log(JSON.stringify(job, null, 2))
  await prisma.$disconnect()
}

main().catch((error) => { console.error(error.message); process.exit(1) })
