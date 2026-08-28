import { randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'
import { HttpError } from '../../utils/errors.js'

const API_BASE = 'https://api-m.sandbox.paypal.com'

function credentials() {
  if (!env.paypalClientId || !env.paypalClientSecret) {
    throw new HttpError(503, 'PayPal Sandbox is not configured', 'PAYPAL_NOT_CONFIGURED')
  }
  if (env.paypalEnv !== 'sandbox') throw new HttpError(503, 'Only PayPal Sandbox is enabled', 'PAYPAL_ENV_DISABLED')
  return { clientId: env.paypalClientId, clientSecret: env.paypalClientSecret }
}

async function parse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new HttpError(response.status >= 500 ? 502 : 409, 'PayPal could not process the request', 'PAYPAL_REQUEST_FAILED')
    error.providerStatus = response.status
    throw error
  }
  return data
}

export class PayPalProvider {
  constructor(fetchImpl = globalThis.fetch) { this.fetch = fetchImpl }

  async accessToken() {
    const { clientId, clientSecret } = credentials()
    const response = await this.fetch(`${API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15_000),
    })
    const data = await parse(response)
    if (!data.access_token) throw new HttpError(502, 'PayPal authentication failed', 'PAYPAL_AUTH_FAILED')
    return data.access_token
  }

  async request(path, { body, requestId = randomUUID() } = {}) {
    const token = await this.accessToken()
    const response = await this.fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': requestId,
        Prefer: 'return=representation',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20_000),
    })
    return parse(response)
  }

  async createOrder({ order, requestId }) {
    return this.request('/v2/checkout/orders', {
      requestId,
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: String(order.id),
          custom_id: order.reference,
          amount: { currency_code: 'USD', value: Number(order.total).toFixed(2) },
        }],
      },
    })
  }

  async captureOrder({ paypalOrderId, requestId }) {
    return this.request(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, { requestId })
  }
}
