import { Router } from 'express'
import * as controller from '../controllers/orderController.js'
export const orderRoutes = (authenticate) => Router().use(authenticate).post('/', controller.create).get('/my-orders', controller.mine).get('/:reference', controller.get)
