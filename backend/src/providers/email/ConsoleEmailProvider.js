import { logger } from '../../config/logger.js'
import { EmailProvider } from './EmailProvider.js'

export class ConsoleEmailProvider extends EmailProvider {
  async send({ to, template, reference }) {
    logger.info('email_demo', { recipientDomain: String(to).split('@')[1] || 'invalid', template, reference })
    return { provider: 'console', accepted: true, demo: true }
  }
}
