import app from './app.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { prisma } from './config/prisma.js'

const server = app.listen(env.port, () => logger.info('server_started', { port: env.port, environment: env.nodeEnv }))
let shuttingDown = false
async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info('server_shutdown', { signal })
  server.close(async (error) => {
    try { await prisma.$disconnect() } finally {
      if (error) logger.error('server_close_failed', { error: error.message })
      process.exit(error ? 1 : 0)
    }
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('unhandledRejection', (error) => logger.error('unhandled_rejection', { errorType: error?.name || 'UnknownError', errorCode: error?.code || 'UNEXPECTED' }))
