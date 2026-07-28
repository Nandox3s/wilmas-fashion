import { prisma } from '../../src/config/prisma.js'
import { ensureLocalOnly } from './_common.js'

ensureLocalOnly('insert-test-job')

async function main() {
  const job = await prisma.job.create({
    data: {
      type: 'ISSUE_INVOICE',
      aggregateId: 'test-invoice-1',
      payload: { invoiceId: 99999, orderId: 99999 },
      status: 'PENDING',
    },
    select: { id: true, type: true, status: true, aggregateId: true },
  })

  console.log(JSON.stringify(job, null, 2))
  await prisma.$disconnect()
}

main().catch((error) => { console.error(error.message); process.exit(1) })
