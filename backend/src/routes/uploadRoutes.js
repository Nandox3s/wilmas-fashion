import { Router } from 'express'
import * as controller from '../controllers/uploadController.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'
export const uploadRoutes = (authenticate) => Router().use(authenticate, authorizeRoles('USER', 'ADMIN')).post('/presign', controller.presign).post('/complete', controller.complete)
