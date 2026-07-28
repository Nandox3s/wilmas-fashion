import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'
import { logger } from '../config/logger.js'
import { EmailService } from '../services/emailService.js'
import { InvoiceService } from '../services/invoiceService.js'
import { StorageService } from '../services/storageService.js'
import { ConsoleEmailProvider } from '../providers/email/ConsoleEmailProvider.js'
import { SesEmailProvider } from '../providers/email/SesEmailProvider.js'
import { getInvoiceProvider } from '../providers/invoices/getInvoiceProvider.js'
import { LocalStorageProvider } from '../providers/storage/LocalStorageProvider.js'
import { S3StorageProvider } from '../providers/storage/S3StorageProvider.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const workerId = process.env.WORKER_ID || `node-${process.pid}`
const lockTimeoutMs = Number(process.env.JOB_LOCK_TIMEOUT_MS || 60_000)
const batchSize = Number(process.env.JOB_BATCH_SIZE || 1)
const runOnce = ['true', '1', 'yes'].includes(String(process.env.WORKER_RUN_ONCE || 'false').toLowerCase())

function sanitizeLastError(error) {
  return String(error?.message || error || 'Unknown worker error').replace(/https?:\/\/[^\s]+/gi, '[redacted-url]').slice(0, 240)
}

function nextBackoff(attempts) {
  const baseSeconds = Math.min(300, 2 ** Math.max(1, attempts))
  const jitter = Math.floor(Math.random() * Math.min(30, baseSeconds))
  return new Date(Date.now() + (baseSeconds + jitter) * 1000)
}

async function claimJob() {
  const now = new Date()

  const stale = new Date(Date.now() - lockTimeoutMs)
  const candidate = await prisma.job.findFirst({
    where: {
      status: 'PENDING',
      nextAttemptAt: { lte: now },
      OR: [{ lockedAt: null }, { lockedAt: { lt: stale } }],
    },
    orderBy: [{ createdAt: 'asc' }],
  })

  if (!candidate) return null

  const claimed = await prisma.job.updateMany({
    where: {
      id: candidate.id,
      status: 'PENDING',
    },
    data: {
      status: 'PROCESSING',
      lockedAt: new Date(),
      lockedBy: workerId,
      attempts: { increment: 1 },
    },
  })

  if (claimed.count !== 1) return null
  return prisma.job.findUnique({ where: { id: candidate.id } })
}

async function processJob(job, services) {
  if (job.type !== 'ISSUE_INVOICE') {
    await prisma.job.update({ where: { id: job.id }, data: { status: 'FAILED', lastError: `Unsupported job type: ${job.type}`, processedAt: new Date() } })
    return
  }

  const invoiceId = Number(job.payload?.invoiceId)
  await services.invoices.process(invoiceId)
  await prisma.job.update({ where: { id: job.id }, data: { status: 'COMPLETED', processedAt: new Date(), lockedAt: null, lockedBy: null } })
}

async function failJob(job, error) {
  const terminal = job.attempts >= env.jobMaxAttempts
  const data = terminal
    ? { status: 'FAILED', lastError: sanitizeLastError(error), processedAt: new Date(), lockedAt: null, lockedBy: null }
    : { status: 'PENDING', nextAttemptAt: nextBackoff(job.attempts), lastError: sanitizeLastError(error), lockedAt: null, lockedBy: null }
  await prisma.job.update({ where: { id: job.id }, data })
}

async function start() {
  logger.info('job_worker_started', { pollMs: env.jobPollIntervalMs, maxAttempts: env.jobMaxAttempts })
  const emailProvider = env.emailProvider === 'console' ? new ConsoleEmailProvider() : new SesEmailProvider()
  const storageProvider = env.storageProvider === 'local' ? new LocalStorageProvider() : new S3StorageProvider()
  const emailService = new EmailService(emailProvider, prisma)
  const storageService = new StorageService(storageProvider)
  const services = {
    invoices: new InvoiceService(prisma, getInvoiceProvider(), storageService, emailService),
  }

  let keepRunning = true
  process.on('SIGINT', async () => { logger.info('job_worker_signal', { signal: 'SIGINT' }); keepRunning = false })
  process.on('SIGTERM', async () => { logger.info('job_worker_signal', { signal: 'SIGTERM' }); keepRunning = false })

  try {
    while (keepRunning) {
      const job = await claimJob()
      if (!job) {
        if (runOnce) break
        await sleep(env.jobPollIntervalMs)
        continue
      }

      try {
        await processJob(job, services)
      } catch (error) {
        logger.error('job_worker_error', { jobId: job.id, message: sanitizeLastError(error) })
        await failJob(job, error)
      }

      if (runOnce) break
    }
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

start().catch(async (error) => {
  logger.error('job_worker_fatal', { message: error?.message || 'Unknown fatal worker error' })
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
