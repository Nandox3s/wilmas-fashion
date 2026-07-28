export class LocalInvoiceQueue {
  constructor(handler) { this.handler = handler }
  async send(message) { await this.handler(message); return { provider: 'local', accepted: true } }
}
