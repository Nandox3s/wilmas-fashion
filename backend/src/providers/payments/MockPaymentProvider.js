import { randomUUID } from 'node:crypto'
import { PaymentProvider } from './PaymentProvider.js'

export class MockPaymentProvider extends PaymentProvider {
  async createPayment({ order, scenario = 'approved' }) {
    return { provider: 'mock', transactionId: `mock-${randomUUID()}`, clientTransactionId: order.reference, scenario, redirectUrl: null }
  }
  async confirmPayment({ transactionId, scenario = 'approved' }) {
    if (scenario === 'error') throw new Error('Mock provider error')
    return { transactionId, status: scenario === 'rejected' ? 'REJECTED' : 'APPROVED', mock: true }
  }
  async verifyCallback(payload) { return { valid: true, eventId: payload.eventId || `mock-event-${payload.transactionId}`, payload } }
  async getTransaction(transactionId) { return { transactionId, status: 'APPROVED', mock: true } }
  async refundPayment({ transactionId }) { return { transactionId, status: 'REFUNDED', mock: true } }
}
