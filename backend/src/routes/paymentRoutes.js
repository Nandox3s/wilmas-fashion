import { Router } from 'express'
import * as controller from '../controllers/paymentController.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'

export const paymentRoutes = (authenticate) => Router()
	.post('/create', authenticate, controller.create)
	.post('/confirm', controller.confirm)
	.post('/payphone/prepare', authenticate, controller.preparePayphone)
	.post('/payphone/confirm', authenticate, controller.confirmPayphone)
	.post('/paypal/create-order', authenticate, controller.createPaypalOrder)
	.post('/paypal/capture-order', authenticate, controller.capturePaypalOrder)
	.post('/admin/:paymentId/reverse', authenticate, authorizeRoles('ADMIN'), controller.reverse)
	.post('/admin/:paymentId/refund', authenticate, authorizeRoles('ADMIN'), controller.refund)
	.get('/:id', authenticate, controller.get)
