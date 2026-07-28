import { randomUUID } from 'node:crypto'
import { InvoiceProvider } from './InvoiceProvider.js'

const DEMO_NOTICES = [
  'DOCUMENTO DE PRUEBA',
  'SIN VALIDEZ TRIBUTARIA',
  'NO AUTORIZADO POR EL SRI',
  'NOT A TAX DOCUMENT',
]

function buildXml(order, authorizationNumber) {
  return Buffer.from(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<demo-invoice legal-document="false">',
      ...DEMO_NOTICES.map((notice) => `<notice>${notice}</notice>`),
      `<authorizationNumber>${authorizationNumber}</authorizationNumber>`,
      `<order>${order.reference}</order>`,
      `<total>${order.total}</total>`,
      '</demo-invoice>',
    ].join(''),
  )
}

function buildPdf(order, authorizationNumber) {
  const content = [
    'DOCUMENTO DE PRUEBA',
    'SIN VALIDEZ TRIBUTARIA',
    'NO AUTORIZADO POR EL SRI',
    'NOT A TAX DOCUMENT',
    `Authorization: ${authorizationNumber}`,
    `Order: ${order.reference}`,
    `Total: ${order.total}`,
  ].join('\n')
  return Buffer.from(`%PDF-1.4\n${content}\n%%EOF`)
}

export class MockInvoiceProvider extends InvoiceProvider {
  async issueInvoice({ order }) {
    const authorizationNumber = `DEMO-${randomUUID()}`
    return { status: 'AUTHORIZED', accessKey: authorizationNumber, authorizationNumber, mock: true }
  }
  async getInvoiceStatus() { return { status: 'AUTHORIZED', mock: true } }
  async getInvoiceDocuments({ order, authorizationNumber, issueResult }) {
    const demoAuthorization = authorizationNumber || issueResult?.authorizationNumber || issueResult?.accessKey || `DEMO-${randomUUID()}`
    return { xml: buildXml(order, demoAuthorization), pdf: buildPdf(order, demoAuthorization) }
  }
  async downloadXml(context) { return (await this.getInvoiceDocuments(context)).xml }
  async downloadRide(context) { return (await this.getInvoiceDocuments(context)).pdf }
  async issueCreditNote() { return { status: 'AUTHORIZED', mock: true, documentType: 'CREDIT_NOTE_DEMO' } }
  async cancelInvoice() { return { status: 'CANCELLED', mock: true } }
}
