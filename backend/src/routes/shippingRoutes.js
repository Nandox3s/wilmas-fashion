import { Router } from 'express'
import * as controller from '../controllers/shippingController.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'

export const shippingRoutes = (authenticate) => Router()
  .get('/orders/:orderId/shipment', authenticate, controller.getOrderShipment)
  .get('/orders/:orderId/tracking', authenticate, controller.getOrderTracking)
  .post('/admin/orders/:orderId/shipment', authenticate, authorizeRoles('ADMIN'), controller.createOrderShipment)
  .patch('/admin/shipments/:shipmentId', authenticate, authorizeRoles('ADMIN'), controller.patchShipment)
  .post('/admin/shipments/:shipmentId/events', authenticate, authorizeRoles('ADMIN'), controller.addShipmentEvent)
  .post('/admin/shipments/:shipmentId/mark-shipped', authenticate, authorizeRoles('ADMIN'), controller.markShipmentShipped)
  .post('/admin/shipments/:shipmentId/mark-delivered', authenticate, authorizeRoles('ADMIN'), controller.markShipmentDelivered)
