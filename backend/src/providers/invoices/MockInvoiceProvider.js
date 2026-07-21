import { randomUUID } from 'node:crypto'
import { InvoiceProvider } from './InvoiceProvider.js'

export class MockInvoiceProvider extends InvoiceProvider {
  async issueInvoice({ order }) {
    const authorizationNumber = `DEMO-${randomUUID()}`
    const xml = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><demo-invoice legal-document="false"><notice>DEMO - NOT A TAX DOCUMENT</notice><order>${order.reference}</order><total>${order.total}</total></demo-invoice>`)
    const ride = Buffer.from(`DEMO RIDE - NOT A TAX DOCUMENT\nOrder: ${order.reference}\nTotal: ${order.total}`)
    return { status: 'AUTHORIZED', accessKey: authorizationNumber, authorizationNumber, xml, ride, mock: true }
  }
  async getInvoiceStatus() { return { status: 'AUTHORIZED', mock: true } }
  async downloadXml({ xml }) { return xml }
  async downloadRide({ ride }) { return ride }
  async cancelInvoice() { return { status: 'CANCELLED', mock: true } }
}
