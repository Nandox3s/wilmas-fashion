import dotenv from 'dotenv'

dotenv.config()

const number = (name, fallback, { min = -Infinity, max = Infinity } = {}) => {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name])
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be a number between ${min} and ${max}`)
  return value
}

const choice = (name, fallback, allowed) => {
  const value = process.env[name] || fallback
  if (!allowed.includes(value)) throw new Error(`${name} must be one of: ${allowed.join(', ')}`)
  return value
}

const nodeEnv = choice('NODE_ENV', 'development', ['development', 'test', 'production'])
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === 'test' ? 'test-only-secret-that-is-at-least-32-characters' : '')
if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required')

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: number('PORT', 4000, { min: 1, max: 65535 }),
  jwtSecret,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean),
  taxRate: number('TAX_RATE', 0.15, { min: 0, max: 1 }),
  shippingAmount: number('SHIPPING_STANDARD_AMOUNT', 5.9, { min: 0 }),
  freeShippingThreshold: number('FREE_SHIPPING_THRESHOLD', 80, { min: 0 }),
  orderExpirationMinutes: number('ORDER_EXPIRATION_MINUTES', 30, { min: 5, max: 1440 }),
  checkoutMode: choice('CHECKOUT_MODE', 'demo', ['demo', 'mock', 'sandbox', 'production']),
  paymentProvider: choice('PAYMENT_PROVIDER', 'mock', ['mock', 'payphone']),
  invoiceProvider: choice('INVOICE_PROVIDER', 'mock', ['mock', 'datil']),
  storageProvider: choice('STORAGE_PROVIDER', 'local', ['local', 's3']),
  emailProvider: choice('EMAIL_PROVIDER', 'console', ['console', 'ses']),
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  presignedUrlTtl: number('S3_PRESIGNED_URL_TTL_SECONDS', 300, { min: 60, max: 900 }),
})

if (env.checkoutMode === 'production' && (env.paymentProvider === 'mock' || env.invoiceProvider === 'mock')) {
  throw new Error('Production checkout cannot use mock payment or invoice providers')
}
