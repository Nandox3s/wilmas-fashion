import { env } from '../../config/env.js'
import { DatilProvider } from './DatilProvider.js'
import { MockInvoiceProvider } from './MockInvoiceProvider.js'

export function getInvoiceProvider() {
  if (env.invoiceProvider === 'mock') return new MockInvoiceProvider()
  if (env.invoiceProvider === 'datil') return new DatilProvider({
    baseUrl: process.env.DATIL_BASE_URL,
    apiKey: process.env.DATIL_API_KEY,
    issuerRuc: process.env.DATIL_ISSUER_RUC,
    timeoutMs: Number(process.env.DATIL_TIMEOUT_MS || 15_000),
  })
  throw new Error(`Unsupported invoice provider: ${env.invoiceProvider}`)
}
