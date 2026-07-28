import { Router } from 'express'
import * as controller from '../controllers/userController.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'
export const userRoutes = (authenticate) => Router().use(authenticate, authorizeRoles('ADMIN')).get('/', controller.listUsers).patch('/:id/role', controller.changeRole).delete('/:id', controller.removeUser)
