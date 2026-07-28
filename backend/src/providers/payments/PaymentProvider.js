export class PaymentProvider {
  async preparePayment(context) { return this.createPayment(context) }
  async createPayment() { throw new Error('createPayment must be implemented') }
  async confirmPayment() { throw new Error('confirmPayment must be implemented') }
  async reversePayment(context) { return this.refundPayment(context) }
  async getTransaction() { throw new Error('getTransaction must be implemented') }
  async refundPayment() { throw new Error('refundPayment must be implemented') }
  async verifyWebhook(context) { return this.verifyCallback(context) }
  async verifyCallback() { throw new Error('verifyCallback must be implemented') }
}
