import { env } from '../../config/env.js'
import { MockPaymentProvider } from './MockPaymentProvider.js'
import { PayPhoneProvider } from './PayPhoneProvider.js'

export function getPaymentProvider() {
  if (env.paymentProvider === 'mock') return new MockPaymentProvider()
  if (env.paymentProvider === 'payphone') return new PayPhoneProvider()
  throw new Error(`Unsupported payment provider: ${env.paymentProvider}`)
}
