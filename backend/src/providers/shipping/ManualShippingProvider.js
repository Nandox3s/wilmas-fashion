import { randomUUID } from 'node:crypto'
import { ShippingProvider } from './ShippingProvider.js'

export class ManualShippingProvider extends ShippingProvider {
  async quote() { return { provider: 'manual', amount: null, currency: 'USD' } }

  async createShipment({ shipment }) {
    return {
      provider: 'manual',
      externalShipmentId: shipment.externalShipmentId || `manual-${randomUUID()}`,
      status: shipment.status || 'READY_FOR_PICKUP',
    }
  }

  async getTracking({ shipment }) {
    return {
      provider: 'manual',
      status: shipment.status,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
    }
  }

  async cancelShipment({ shipment }) {
    return { provider: 'manual', shipmentId: shipment.id, status: 'CANCELLED' }
  }
}
