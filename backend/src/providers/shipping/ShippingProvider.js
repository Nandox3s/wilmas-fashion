export class ShippingProvider {
  async quote() { throw new Error('quote must be implemented') }
  async createShipment() { throw new Error('createShipment must be implemented') }
  async getTracking() { throw new Error('getTracking must be implemented') }
  async cancelShipment() { throw new Error('cancelShipment must be implemented') }
}
