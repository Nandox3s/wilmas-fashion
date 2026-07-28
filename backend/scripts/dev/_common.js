import { exit } from 'node:process'

export function ensureLocalOnly(scriptName) {
  if (process.env.NODE_ENV === 'production') {
    console.error(`${scriptName} is disabled in production`)
    exit(1)
  }
}

export function summarizeText(value, max = 120) {
  const text = String(value ?? '')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function summarizeJob(job) {
  return {
    id: job.id,
    type: job.type,
    aggregateId: job.aggregateId,
    status: job.status,
    attempts: job.attempts,
    nextAttemptAt: job.nextAttemptAt,
    processedAt: job.processedAt,
    lastError: summarizeText(job.lastError, 160),
  }
}
