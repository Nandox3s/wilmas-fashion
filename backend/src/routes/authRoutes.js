import { Router } from 'express'
import * as controller from '../controllers/authController.js'
import { authRateLimiter } from '../middleware/rateLimitMiddleware.js'
export const authRoutes = (authenticate) => Router()
  .post('/register', authRateLimiter, controller.register)
  .post('/login', authRateLimiter, controller.login)
  .post('/google', authRateLimiter, controller.google)
  .post('/facebook', authRateLimiter, controller.facebook)
  .get('/me', authenticate, controller.me)
