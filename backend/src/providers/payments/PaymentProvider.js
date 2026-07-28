export class PaymentProvider {
  async createPayment() { throw new Error('createPayment must be implemented') }
  async confirmPayment() { throw new Error('confirmPayment must be implemented') }
  async verifyCallback() { throw new Error('verifyCallback must be implemented') }
  async getTransaction() { throw new Error('getTransaction must be implemented') }
  async refundPayment() { throw new Error('refundPayment must be implemented') }
}
