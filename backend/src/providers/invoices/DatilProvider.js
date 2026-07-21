import { InvoiceProvider } from './InvoiceProvider.js'

export class DatilProvider extends InvoiceProvider {
  unavailable() { throw Object.assign(new Error('Datil adapter requires official sandbox contract verification and credentials'), { status: 503 }) }
  async issueInvoice() { return this.unavailable() }
  async getInvoiceStatus() { return this.unavailable() }
  async downloadXml() { return this.unavailable() }
  async downloadRide() { return this.unavailable() }
  async cancelInvoice() { return this.unavailable() }
}
