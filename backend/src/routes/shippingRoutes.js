import { Router } from 'express'
import * as controller from '../controllers/shippingController.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'

export const shippingRoutes = (authenticate) => Router()
  .use(authenticate)
  .get('/orders/:orderId/shipment', controller.getOrderShipment)
  .get('/orders/:orderId/tracking', controller.getOrderTracking)
  .post('/admin/orders/:orderId/shipment', authorizeRoles('ADMIN'), controller.createOrderShipment)
  .patch('/admin/shipments/:shipmentId', authorizeRoles('ADMIN'), controller.patchShipment)
  .post('/admin/shipments/:shipmentId/events', authorizeRoles('ADMIN'), controller.addShipmentEvent)
  .post('/admin/shipments/:shipmentId/mark-shipped', authorizeRoles('ADMIN'), controller.markShipmentShipped)
  .post('/admin/shipments/:shipmentId/mark-delivered', authorizeRoles('ADMIN'), controller.markShipmentDelivered)
