import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import multer from 'multer'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { env } from './config/env.js'
import { prisma as defaultPrisma } from './config/prisma.js'
import { authenticateToken } from './middleware/authMiddleware.js'
import { authorizeRoles } from './middleware/roleMiddleware.js'
import { errorMiddleware, notFoundMiddleware } from './middleware/errorMiddleware.js'
import { authRoutes } from './routes/authRoutes.js'
import { invoiceRoutes } from './routes/invoiceRoutes.js'
import { orderRoutes } from './routes/orderRoutes.js'
import { paymentRoutes } from './routes/paymentRoutes.js'
import { productRoutes } from './routes/productRoutes.js'
import { uploadRoutes } from './routes/uploadRoutes.js'
import { userRoutes } from './routes/userRoutes.js'
import { AuthService } from './services/authService.js'
import { EmailService } from './services/emailService.js'
import { InvoiceService } from './services/invoiceService.js'
import { OrderService } from './services/orderService.js'
import { PaymentService } from './services/paymentService.js'
import { ProductService } from './services/productService.js'
import { StorageService } from './services/storageService.js'
import { ConsoleEmailProvider } from './providers/email/ConsoleEmailProvider.js'
import { SesEmailProvider } from './providers/email/SesEmailProvider.js'
import { MockInvoiceProvider } from './providers/invoices/MockInvoiceProvider.js'
import { DatilProvider } from './providers/invoices/DatilProvider.js'
import { MockPaymentProvider } from './providers/payments/MockPaymentProvider.js'
import { PayPhoneProvider } from './providers/payments/PayPhoneProvider.js'
import { LocalStorageProvider } from './providers/storage/LocalStorageProvider.js'
import { S3StorageProvider } from './providers/storage/S3StorageProvider.js'
import { asyncHandler, HttpError } from './utils/errors.js'
import { integer, serializeMoney } from './utils/validation.js'
import * as paymentController from './controllers/paymentController.js'
import * as invoiceController from './controllers/invoiceController.js'
import { LocalInvoiceQueue } from './providers/queue/LocalInvoiceQueue.js'
import { SqsInvoiceQueue } from './providers/queue/SqsInvoiceQueue.js'
import { createInvoiceWorker } from './workers/invoiceWorker.js'

function providers() {
  return {
    payment: env.paymentProvider === 'mock' ? new MockPaymentProvider() : new PayPhoneProvider(),
    invoice: env.invoiceProvider === 'mock' ? new MockInvoiceProvider() : new DatilProvider(),
    storage: env.storageProvider === 'local' ? new LocalStorageProvider(resolve('uploads')) : new S3StorageProvider(),
    email: env.emailProvider === 'console' ? new ConsoleEmailProvider() : new SesEmailProvider(),
  }
}

export function createApp({ prisma = defaultPrisma, providerOverrides = {} } = {}) {
  const app = express()
  const selected = { ...providers(), ...providerOverrides }
  const emailService = new EmailService(selected.email)
  const storageService = new StorageService(selected.storage)
  const services = {
    prisma,
    auth: new AuthService(prisma), products: new ProductService(prisma), orders: new OrderService(prisma),
    email: emailService, storage: storageService,
  }
  services.invoices = new InvoiceService(prisma, selected.invoice, storageService, emailService)
  const invoiceQueue = process.env.INVOICE_QUEUE_PROVIDER === 'sqs' ? new SqsInvoiceQueue() : new LocalInvoiceQueue(createInvoiceWorker(services.invoices))
  services.payments = new PaymentService(prisma, selected.payment, emailService, invoiceQueue)
  const authenticate = authenticateToken(prisma)

  app.disable('x-powered-by')
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({ origin(origin, callback) { callback(null, !origin || env.corsOrigins.includes(origin)) }, credentials: false }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ limit: '1mb', extended: true }))
  app.use((req, res, next) => { req.services = services; next() })
  app.use('/uploads', express.static(resolve('uploads'), { fallthrough: true, dotfiles: 'deny', maxAge: env.isProduction ? '1h' : 0 }))

  app.get('/', (req, res) => res.json({ message: 'Wilmas Fashion API', status: 'running', timestamp: new Date().toISOString() }))
  app.get('/api/ping', asyncHandler(async (req, res) => { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() }) }))
  app.use('/api/auth', authRoutes(authenticate))
  app.use('/api/products', productRoutes(authenticate))
  app.use('/api/users', userRoutes(authenticate))
  app.use('/api/orders', orderRoutes(authenticate))
  app.use('/api/payments', paymentRoutes(authenticate))
  app.post('/api/webhooks/payphone', paymentController.webhook)
  app.use('/api/invoices', invoiceRoutes(authenticate))
  app.use('/api/uploads', uploadRoutes(authenticate))
  app.get('/api/admin/orders', authenticate, authorizeRoles('ADMIN'), asyncHandler(async (req, res) => res.json(await services.orders.all())))
  app.post('/api/admin/invoices/:id/retry', authenticate, authorizeRoles('ADMIN'), invoiceController.retry)

  const localUploads = resolve('uploads')
  const upload = multer({ storage: multer.diskStorage({ destination: async (req, file, callback) => { try { await mkdir(localUploads, { recursive: true }); callback(null, localUploads) } catch (error) { callback(error) } }, filename: (req, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}.${file.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : file.mimetype.split('/')[1]}`) }), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) })
  app.post('/api/upload', authenticate, authorizeRoles('USER', 'ADMIN'), upload.single('file'), (req, res) => { if (!req.file) return res.status(400).json({ error: 'No valid image uploaded' }); res.json({ filename: req.file.filename, url: `/uploads/${req.file.filename}` }) })

  app.post('/api/sales', authenticate, asyncHandler(async (req, res) => {
    const productId = integer(req.body.productId, 'Product ID', { min: 1 }); const quantity = integer(req.body.quantity, 'Quantity', { min: 1 })
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } }); if (!product) throw new HttpError(404, 'Product not found')
      const changed = await tx.product.updateMany({ where: { id: productId, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } }); if (changed.count !== 1) throw new HttpError(409, 'Insufficient stock')
      const discount = product.onOffer ? Number(product.discount) : 0; const unitPrice = Math.round(Number(product.price) * (1 - discount / 100) * 100) / 100
      return tx.sale.create({ data: { userId: req.user.id, productId, quantity, total: (unitPrice * quantity).toFixed(2) } })
    })
    res.json(serializeMoney(result))
  }))
  app.get('/api/sales', authenticate, authorizeRoles('ADMIN'), asyncHandler(async (req, res) => res.json(serializeMoney(await prisma.sale.findMany({ include: { product: true, user: { select: { id: true, name: true, email: true } } } })))))
  app.get('/api/stats/overview', asyncHandler(async (req, res) => res.json({ totalProducts: await prisma.product.count(), onOfferCount: await prisma.product.count({ where: { onOffer: true } }), lowStockCount: await prisma.product.count({ where: { stock: { lt: 10 } } }) })))
  app.get('/api/analytics/dashboard', authenticate, authorizeRoles('ADMIN'), asyncHandler(async (req, res) => { const [totalSales, revenue, totalUsers, totalProducts] = await Promise.all([prisma.sale.count(), prisma.sale.aggregate({ _sum: { total: true } }), prisma.user.count(), prisma.product.count()]); res.json({ totalSales, totalRevenue: Number(revenue._sum.total || 0), totalUsers, totalProducts }) }))

  app.use(notFoundMiddleware)
  app.use(errorMiddleware)
  return app
}

export const app = createApp()
export default app
