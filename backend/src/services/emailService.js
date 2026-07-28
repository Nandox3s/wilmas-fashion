import { createHash } from 'node:crypto'

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 500

function deduplicationKey(message) {
  const parts = [message.template, message.to, message.orderId, message.reference].join('|')
  return createHash('sha256').update(parts).digest('hex').slice(0, 32)
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class EmailService {
  constructor(provider, prisma = null) { this.provider = provider; this.prisma = prisma }

  async send(message) {
    const payload = {
      type: String(message.template || 'generic'),
      recipient: String(message.to || '').trim(),
      provider: this.provider?.constructor?.name || 'unknown',
      orderId: message.orderId ? Number(message.orderId) : null,
    }

    let lastError = null
    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        const result = await this.provider.send(message)
        if (this.prisma) {
          await this.prisma.notification.create({
            data: {
              ...payload,
              status: result.accepted ? 'SENT' : 'REJECTED',
              attempts: attempt,
              sentAt: result.accepted ? new Date() : null,
            },
          }).catch(() => {}) // notification failure must not block email flow
        }
        return result
      } catch (error) {
        lastError = error
        if (attempt <= MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt)
      }
    }

    if (this.prisma) {
      await this.prisma.notification.create({
        data: {
          ...payload,
          status: 'ERROR',
          attempts: MAX_RETRIES + 1,
          lastError: String(lastError?.message || 'Unknown email error').slice(0, 240),
        },
      }).catch(() => {})
    }
    throw lastError
  }
}
