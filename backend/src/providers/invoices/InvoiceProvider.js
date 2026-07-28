export class InvoiceProvider {
  async issueInvoice() { throw new Error('issueInvoice must be implemented') }
  async getInvoiceStatus() { throw new Error('getInvoiceStatus must be implemented') }
  async getInvoiceDocuments(context) { return { xml: await this.downloadXml(context), pdf: await this.downloadRide(context) } }
  async issueCreditNote() { throw new Error('issueCreditNote must be implemented') }
  async downloadXml() { throw new Error('downloadXml must be implemented') }
  async downloadRide() { throw new Error('downloadRide must be implemented') }
  async cancelInvoice() { throw new Error('cancelInvoice must be implemented') }
}
