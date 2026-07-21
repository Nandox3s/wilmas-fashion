import { Router } from 'express'
import * as controller from '../controllers/paymentController.js'
export const paymentRoutes = (authenticate) => Router().post('/create', authenticate, controller.create).post('/confirm', controller.confirm).get('/:id', authenticate, controller.get)
