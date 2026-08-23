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

const requiredWhen = (condition, key, message) => {
  if (condition && !String(process.env[key] || '').trim()) {
    throw new Error(message || `${key} is required`)
  }
}

const nodeEnv = choice('NODE_ENV', 'development', ['development', 'test', 'production'])
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === 'test' ? 'test-only-secret-that-is-at-least-32-characters' : '')
if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required')

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
  host: process.env.HOST || '0.0.0.0',
  port: number('PORT', 4000, { min: 1, max: 65535 }),
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
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
  shippingProvider: choice('SHIPPING_PROVIDER', 'manual', ['manual', 'mock', 'laar']),
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  presignedUrlTtl: number('S3_PRESIGNED_URL_TTL_SECONDS', 300, { min: 60, max: 900 }),
  jobMaxAttempts: number('JOB_MAX_ATTEMPTS', 5, { min: 1, max: 20 }),
  jobPollIntervalMs: number('JOB_POLL_INTERVAL_MS', 5000, { min: 500, max: 120000 }),
  googleClientId: String(process.env.GOOGLE_CLIENT_ID || '').trim(),
  facebookAppId: String(process.env.FACEBOOK_APP_ID || '').trim(),
  facebookAppSecret: String(process.env.FACEBOOK_APP_SECRET || '').trim(),
})

if (env.checkoutMode === 'production' && (env.paymentProvider === 'mock' || env.invoiceProvider === 'mock')) {
  throw new Error('Production checkout cannot use mock payment or invoice providers')
}

requiredWhen(env.paymentProvider === 'payphone', 'PAYPHONE_TOKEN', 'PAYPHONE_TOKEN is required when PAYMENT_PROVIDER=payphone')
requiredWhen(env.paymentProvider === 'payphone', 'PAYPHONE_STORE_ID', 'PAYPHONE_STORE_ID is required when PAYMENT_PROVIDER=payphone')
requiredWhen(env.paymentProvider === 'payphone', 'PAYPHONE_RESPONSE_URL', 'PAYPHONE_RESPONSE_URL is required when PAYMENT_PROVIDER=payphone')

requiredWhen(env.invoiceProvider === 'datil', 'DATIL_API_KEY', 'DATIL_API_KEY is required when INVOICE_PROVIDER=datil')
requiredWhen(env.invoiceProvider === 'datil', 'DATIL_BASE_URL', 'DATIL_BASE_URL is required when INVOICE_PROVIDER=datil')
requiredWhen(env.invoiceProvider === 'datil', 'DATIL_ISSUER_RUC', 'DATIL_ISSUER_RUC is required when INVOICE_PROVIDER=datil')

requiredWhen(env.emailProvider === 'ses', 'SES_FROM_EMAIL', 'SES_FROM_EMAIL is required when EMAIL_PROVIDER=ses')
