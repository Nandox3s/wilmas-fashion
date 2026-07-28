import { prisma } from '../../src/config/prisma.js'
import { ensureLocalOnly, summarizeJob } from './_common.js'

ensureLocalOnly('show-jobs')

async function main() {
  const jobs = await prisma.job.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, type: true, aggregateId: true, status: true, attempts: true, nextAttemptAt: true, processedAt: true, lastError: true } })
  console.log(JSON.stringify(jobs.map(summarizeJob), null, 2))
  await prisma.$disconnect()
}

main().catch((error) => { console.error(error.message); process.exit(1) })
