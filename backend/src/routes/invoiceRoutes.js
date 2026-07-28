import { Router } from 'express'
import * as controller from '../controllers/invoiceController.js'
export const invoiceRoutes = (authenticate) => Router().use(authenticate).get('/order/:orderReference', controller.byOrder).get('/:id/ride-url', controller.ride).get('/:id/xml-url', controller.xml).get('/:id', controller.get)
