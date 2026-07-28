import { env } from '../../config/env.js'
import { LaarShippingProvider } from './LaarShippingProvider.js'
import { ManualShippingProvider } from './ManualShippingProvider.js'
import { MockShippingProvider } from './MockShippingProvider.js'

export function getShippingProvider() {
  if (env.shippingProvider === 'manual') return new ManualShippingProvider()
  if (env.shippingProvider === 'mock') return new MockShippingProvider()
  if (env.shippingProvider === 'laar') return new LaarShippingProvider()
  throw new Error(`Unsupported shipping provider: ${env.shippingProvider}`)
}
