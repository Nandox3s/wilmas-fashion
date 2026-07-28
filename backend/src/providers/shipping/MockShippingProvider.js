import { randomUUID } from 'node:crypto'
import { ShippingProvider } from './ShippingProvider.js'

export class MockShippingProvider extends ShippingProvider {
  async quote() { return { provider: 'mock', amount: 0, currency: 'USD' } }

  async createShipment() {
    return {
      provider: 'mock',
      externalShipmentId: `mock-${randomUUID()}`,
      status: 'READY_FOR_PICKUP',
      trackingNumber: `WF-MOCK-${Date.now().toString().slice(-6)}`,
      trackingUrl: 'https://example.test/tracking/mock',
    }
  }

  async getTracking({ shipment }) {
    return {
      provider: 'mock',
      status: shipment.status,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
    }
  }

  async cancelShipment({ shipment }) {
    return { provider: 'mock', shipmentId: shipment.id, status: 'CANCELLED' }
  }
}
