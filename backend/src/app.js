import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import multer from 'multer'
import { mkdir, readFile, unlink } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
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
import { shippingRoutes } from './routes/shippingRoutes.js'
import { uploadRoutes } from './routes/uploadRoutes.js'
import { userRoutes } from './routes/userRoutes.js'
import { AuthService } from './services/authService.js'
import { EmailService } from './services/emailService.js'
import { InvoiceService } from './services/invoiceService.js'
import { OrderService } from './services/orderService.js'
import { PaymentService } from './services/paymentService.js'
import { ProductService } from './services/productService.js'
import { ShippingService } from './services/shippingService.js'
import { StorageService } from './services/storageService.js'
import { ConsoleEmailProvider } from './providers/email/ConsoleEmailProvider.js'
import { SesEmailProvider } from './providers/email/SesEmailProvider.js'
import { getInvoiceProvider } from './providers/invoices/getInvoiceProvider.js'
import { getPaymentProvider } from './providers/payments/getPaymentProvider.js'
import { getShippingProvider } from './providers/shipping/getShippingProvider.js'
import { LocalStorageProvider } from './providers/storage/LocalStorageProvider.js'
import { S3StorageProvider } from './providers/storage/S3StorageProvider.js'
import { asyncHandler, HttpError } from './utils/errors.js'
import { integer, serializeMoney } from './utils/validation.js'
import * as paymentController from './controllers/paymentController.js'
import * as invoiceController from './controllers/invoiceController.js'
import { LocalInvoiceQueue } from './providers/queue/LocalInvoiceQueue.js'
import { SqsInvoiceQueue } from './providers/queue/SqsInvoiceQueue.js'
import { DbJobQueue } from './providers/queue/DbJobQueue.js'
import { createInvoiceWorker } from './workers/invoiceWorker.js'
import { IMAGE_TYPES, MAX_IMAGE_BYTES, validateImageBytes } from './utils/fileValidation.js'
import { FacebookAuthProvider, GoogleAuthProvider } from './providers/auth/socialAuthProviders.js'

function providers() {
  const uploadsRoot = resolve(env.uploadsDir)
  return {
    payment: getPaymentProvider(),
    invoice: getInvoiceProvider(),
    shipping: getShippingProvider(),
    storage: env.storageProvider === 'local' ? new LocalStorageProvider(uploadsRoot) : new S3StorageProvider(),
    email: env.emailProvider === 'console' ? new ConsoleEmailProvider() : new SesEmailProvider(),
    googleAuth: new GoogleAuthProvider(),
    facebookAuth: new FacebookAuthProvider(),
  }
}

export function createApp({ prisma = defaultPrisma, providerOverrides = {}, mockPayphoneServerEnabled = process.env.PAYPHONE_MOCK_SERVER_ENABLED === 'true', isProduction = env.isProduction } = {}) {
  const app = express()
  const uploadsRoot = resolve(env.uploadsDir)
  app.set('trust proxy', env.trustProxy)
  const selected = { ...providers(), ...providerOverrides }
  const emailService = new EmailService(selected.email, prisma)
  const storageService = new StorageService(selected.storage)
  const services = {
    prisma,
    auth: new AuthService(prisma, { google: selected.googleAuth, facebook: selected.facebookAuth }), products: new ProductService(prisma, storageService), orders: new OrderService(prisma),
    email: emailService, storage: storageService,
  }
  services.invoices = new InvoiceService(prisma, selected.invoice, storageService, emailService)
  services.shipping = new ShippingService(prisma, selected.shipping, emailService)
  const invoiceQueue = process.env.INVOICE_QUEUE_PROVIDER === 'sqs'
    ? new SqsInvoiceQueue()
    : process.env.INVOICE_QUEUE_PROVIDER === 'local'
      ? new LocalInvoiceQueue(createInvoiceWorker(services.invoices))
      : new DbJobQueue(prisma)
  services.payments = new PaymentService(prisma, selected.payment, emailService, invoiceQueue)
  const authenticate = authenticateToken(prisma)

  app.disable('x-powered-by')
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({ origin(origin, callback) { callback(null, !origin || env.corsOrigins.includes(origin)) }, credentials: false }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ limit: '1mb', extended: true }))
  app.use((req, res, next) => { req.services = services; next() })
  app.use('/uploads/invoices', (req, res) => res.status(404).json({ error: 'Not found' }))
  app.use('/uploads', express.static(uploadsRoot, { fallthrough: true, dotfiles: 'deny', maxAge: env.isProduction ? '1h' : 0 }))

  app.get('/', (req, res) => res.json({ message: 'Wilmas Fashion API', status: 'running', timestamp: new Date().toISOString() }))
  app.get('/api/ping', asyncHandler(async (req, res) => { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() }) }))
  app.use('/api/auth', authRoutes(authenticate))
  app.use('/api/products', productRoutes(authenticate))
  app.use('/api/users', userRoutes(authenticate))
  app.use('/api/orders', orderRoutes(authenticate))
  app.use('/api/payments', paymentRoutes(authenticate))
  app.post('/api/webhooks/payphone', paymentController.webhook)
  // Local mock endpoints to simulate PayPhone sandbox for development/testing.
  // These routes are mounted only when PAYPHONE_MOCK_SERVER_ENABLED=true and never in production.
  if (mockPayphoneServerEnabled && !isProduction) {
    // These allow setting PAYPHONE_API_BASE=http://127.0.0.1:4000/mock-payphone
    app.post('/mock-payphone/button/Prepare', asyncHandler(async (req, res) => {
      const body = req.body || {}
      const paymentId = Math.floor(Math.random() * 900000) + 100000
      const redirectUrl = `${process.env.PAYPHONE_ALLOWED_DOMAIN || 'http://localhost:5173'}/mock-payphone/checkout?paymentId=${paymentId}`
      return res.json({ paymentId, payWithCard: redirectUrl, payWithPayPhone: null })
    }))
    app.post('/mock-payphone/button/V2/Confirm', asyncHandler(async (req, res) => {
      const body = req.body || {}
      const id = Number(body.id || body.transactionId || 0)
      return res.json({ transactionId: id, clientTransactionId: body.clientTxId || body.clientTransactionId || null, amount: body.amount || 0, currency: body.currency || 'USD', transactionStatus: 'Approved', statusCode: '00', messageCode: 'APPROVED' })
    }))
  }
  app.use('/api/invoices', invoiceRoutes(authenticate))
  app.use('/api', shippingRoutes(authenticate))
  app.use('/api/uploads', uploadRoutes(authenticate))
  app.get('/api/admin/orders', authenticate, authorizeRoles('ADMIN'), asyncHandler(async (req, res) => res.json(await services.orders.all())))
  app.post('/api/admin/invoices/:id/retry', authenticate, authorizeRoles('ADMIN'), invoiceController.retry)
  app.post('/api/admin/payments/:paymentId/reverse', authenticate, authorizeRoles('ADMIN'), paymentController.reverse)
  app.post('/api/admin/payments/:paymentId/refund', authenticate, authorizeRoles('ADMIN'), paymentController.refund)

  const localUploads = uploadsRoot
  const upload = multer({ storage: multer.diskStorage({ destination: async (req, file, callback) => { try { await mkdir(localUploads, { recursive: true }); callback(null, localUploads) } catch (error) { callback(error) } }, filename: (req, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}${extname(file.originalname).toLowerCase()}`) }), limits: { fileSize: MAX_IMAGE_BYTES }, fileFilter: (req, file, callback) => callback(null, IMAGE_TYPES[file.mimetype]?.includes(extname(file.originalname).toLowerCase()) === true) })
  app.post('/api/upload', authenticate, authorizeRoles('USER', 'ADMIN'), upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No valid image uploaded')
    try { validateImageBytes({ buffer: (await readFile(req.file.path)).subarray(0, 16), mimeType: req.file.mimetype, extension: extname(req.file.originalname), size: req.file.size }) }
    catch (error) { await unlink(req.file.path).catch(() => {}); throw error }
    res.json({ filename: req.file.filename, url: `/uploads/${req.file.filename}` })
  }))

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
