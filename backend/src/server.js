import { logger } from './config/logger.js'
import { loadManagedSecrets } from './config/managedSecrets.js'

await loadManagedSecrets()
const [{ default: app }, { env }, { prisma }] = await Promise.all([import('./app.js'), import('./config/env.js'), import('./config/prisma.js')])

const server = app.listen(env.port, env.host, () => logger.info('server_started', { host: env.host, port: env.port, environment: env.nodeEnv }))
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
