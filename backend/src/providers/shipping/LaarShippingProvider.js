import { ShippingProvider } from './ShippingProvider.js'

export class LaarShippingProvider extends ShippingProvider {
  unavailable() {
    throw Object.assign(new Error('LAAR provider is reserved for future integration and requires official contract details.'), { status: 503 })
  }

  async quote() { return this.unavailable() }
  async createShipment() { return this.unavailable() }
  async getTracking() { return this.unavailable() }
  async cancelShipment() { return this.unavailable() }
}
