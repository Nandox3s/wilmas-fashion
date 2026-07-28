import { Router } from 'express'
import * as controller from '../controllers/productController.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'
export const productRoutes = (authenticate) => Router().get('/', controller.list).get('/:id', controller.get).post('/', authenticate, authorizeRoles('USER', 'ADMIN'), controller.create).put('/:id', authenticate, authorizeRoles('USER', 'ADMIN'), controller.update).patch('/:id/price', authenticate, authorizeRoles('USER', 'ADMIN'), controller.updatePrice).patch('/:id/stock', authenticate, authorizeRoles('USER', 'ADMIN'), controller.updateStock).delete('/:id', authenticate, authorizeRoles('ADMIN'), controller.remove)
