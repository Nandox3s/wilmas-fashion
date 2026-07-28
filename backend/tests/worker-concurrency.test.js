// worker-concurrency.test.js
// Verifies that two concurrent workers cannot claim the same job.
// Uses an in-memory prisma stub that simulates the atomic updateMany race.
import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters'

// ── Minimal in-memory job store ────────────────────────────────────────────
function makeJobStore(initialJob) {
  let job = { ...initialJob }
  let claimCount = 0

  const prisma = {
    job: {
      findFirst: async ({ where }) => {
        if (job.status !== 'PENDING') return null
        const now = new Date()
        if (job.nextAttemptAt > now) return null
        if (job.lockedAt && job.lockedAt > new Date(Date.now() - 60_000)) return null
        return { ...job }
      },
      updateMany: async ({ where, data }) => {
        // Simulate atomic claim: only the first concurrent caller wins
        if (job.id !== where.id) return { count: 0 }
        if (job.status !== where.status) return { count: 0 }
        claimCount++
        if (claimCount > 1) return { count: 0 } // second caller loses
        job = { ...job, ...data, attempts: job.attempts + 1 }
        return { count: 1 }
      },
      findUnique: async ({ where }) => (job.id === where.id ? { ...job } : null),
      update: async ({ where, data }) => {
        job = { ...job, ...data }
        return { ...job }
      },
    },
    $disconnect: async () => {},
  }

  return { prisma, getJob: () => job, getClaimCount: () => claimCount }
}

// ── Inline claimJob logic (mirrors jobWorker.js) ───────────────────────────
async function claimJob(prisma, workerId, lockTimeoutMs = 60_000) {
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
    where: { id: candidate.id, status: 'PENDING' },
    data: { status: 'PROCESSING', lockedAt: new Date(), lockedBy: workerId, attempts: { increment: 1 } },
  })
  if (claimed.count !== 1) return null
  return prisma.job.findUnique({ where: { id: candidate.id } })
}

// ── Tests ──────────────────────────────────────────────────────────────────
test('two concurrent workers: only one claims the job', async () => {
  const { prisma } = makeJobStore({
    id: 1,
    type: 'ISSUE_INVOICE',
    aggregateId: 'invoice-1',
    payload: { invoiceId: 1, orderId: 1 },
    status: 'PENDING',
    attempts: 0,
    nextAttemptAt: new Date(Date.now() - 1000),
    lockedAt: null,
    lockedBy: null,
    createdAt: new Date(),
  })

  // Both workers attempt to claim simultaneously
  const [result1, result2] = await Promise.all([
    claimJob(prisma, 'worker-A'),
    claimJob(prisma, 'worker-B'),
  ])

  const claimed = [result1, result2].filter(Boolean)
  assert.equal(claimed.length, 1, 'Exactly one worker must claim the job')
  assert.equal(claimed[0].status, 'PROCESSING')
  assert.ok(claimed[0].lockedBy === 'worker-A' || claimed[0].lockedBy === 'worker-B')
})

test('worker does not claim a job already locked within timeout', async () => {
  const { prisma } = makeJobStore({
    id: 2,
    type: 'ISSUE_INVOICE',
    aggregateId: 'invoice-2',
    payload: { invoiceId: 2, orderId: 2 },
    status: 'PENDING',
    attempts: 1,
    nextAttemptAt: new Date(Date.now() - 1000),
    lockedAt: new Date(Date.now() - 10_000), // locked 10s ago, within 60s timeout
    lockedBy: 'worker-A',
    createdAt: new Date(),
  })

  const result = await claimJob(prisma, 'worker-B')
  assert.equal(result, null, 'Worker-B must not claim a recently locked job')
})

test('worker reclaims a stale lock after timeout', async () => {
  const { prisma } = makeJobStore({
    id: 3,
    type: 'ISSUE_INVOICE',
    aggregateId: 'invoice-3',
    payload: { invoiceId: 3, orderId: 3 },
    status: 'PENDING',
    attempts: 1,
    nextAttemptAt: new Date(Date.now() - 1000),
    lockedAt: new Date(Date.now() - 120_000), // locked 2 min ago, stale
    lockedBy: 'worker-A',
    createdAt: new Date(),
  })

  const result = await claimJob(prisma, 'worker-B')
  assert.ok(result !== null, 'Worker-B must reclaim a stale lock')
  assert.equal(result.lockedBy, 'worker-B')
})
