import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { persistSession, sessionPayload, shouldClearSession } from '../src/services/apiClient.js'

function token(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode(payload)}.`
}

test('social login uses the existing session storage and survives a page reload', () => {
  const values = new Map()
  global.window = {
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  }
  const jwt = token({ userId: 15, email: 'social@example.com', role: 'USER', exp: Math.floor(Date.now() / 1000) + 3600 })
  persistSession({ token: jwt, user: { id: 15, email: 'social@example.com', role: 'USER' } })
  assert.equal(sessionPayload().userId, 15)
  assert.equal(window.localStorage.getItem('role'), 'USER')
})

test('an unrelated unauthenticated 401 does not destroy a valid session', () => {
  const error = { response: { status: 401, data: { code: 'AUTH_REQUIRED' } }, config: { headers: {} } }
  assert.equal(shouldClearSession(error, 'valid-session-token'), false)
})

test('an authenticated request with an invalid session does clear it', () => {
  const error = { response: { status: 401, data: { code: 'INVALID_SESSION' } }, config: { headers: { Authorization: 'Bearer invalid' } } }
  assert.equal(shouldClearSession(error, 'invalid'), true)
})

test('social login keeps the official Google credential flow and a local Facebook SVG', async () => {
  const source = await readFile(new URL('../src/components/SocialLoginButtons.jsx', import.meta.url), 'utf8')
  assert.match(source, /GoogleLogin/)
  assert.match(source, /result\.credential/)
  assert.match(source, /onFacebook\(response\.authResponse\.accessToken\)/)
  assert.match(source, /<svg className="social-facebook-mark"/)
  assert.doesNotMatch(source, /social-facebook-mark"[^>]*>f</)
  assert.match(source, /if \(facebookSdkPromise\) return facebookSdkPromise/)
})

test('production CSP permits only the required social authentication origins', async () => {
  const csp = await readFile(new URL('../../ops/lightsail/templates/nginx-security-headers.conf', import.meta.url), 'utf8')
  assert.match(csp, /https:\/\/accounts\.google\.com/)
  assert.match(csp, /https:\/\/connect\.facebook\.net/)
  assert.match(csp, /https:\/\/graph\.facebook\.com/)
  assert.doesNotMatch(csp, /(?:^|\s)\*(?:\s|;|$)/)
  assert.doesNotMatch(csp, /unsafe-eval/)
})

test('social login is feature-flagged off in the Lightsail build without deleting its implementation', async () => {
  const login = await readFile(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8')
  const social = await readFile(new URL('../src/components/SocialLoginButtons.jsx', import.meta.url), 'utf8')
  const lightsailEnv = await readFile(new URL('../.env.lightsail', import.meta.url), 'utf8')
  assert.match(login, /VITE_SOCIAL_LOGIN_ENABLED === 'true'/)
  assert.match(login, /socialLoginEnabled &&/)
  assert.match(lightsailEnv, /^VITE_SOCIAL_LOGIN_ENABLED=false$/m)
  assert.match(social, /GoogleLogin/)
  assert.match(social, /FB\.login/)
})

test('PayPal checkout uses the official button and server-side create/capture endpoints', async () => {
  const button = await readFile(new URL('../src/components/PayPalCheckoutButton.jsx', import.meta.url), 'utf8')
  const checkout = await readFile(new URL('../src/pages/Checkout.jsx', import.meta.url), 'utf8')
  const service = await readFile(new URL('../src/services/orderService.js', import.meta.url), 'utf8')
  const example = await readFile(new URL('../.env.example', import.meta.url), 'utf8')
  const csp = await readFile(new URL('../../ops/lightsail/templates/nginx-security-headers.conf', import.meta.url), 'utf8')
  assert.match(button, /PayPalButtons/)
  assert.match(button, /PayPalScriptProvider/)
  assert.match(button, /usePayPalScriptReducer/)
  assert.match(button, /isPending/)
  assert.match(button, /isResolved/)
  assert.match(button, /isRejected/)
  assert.match(button, /20_000/)
  assert.match(checkout, /capturePaypalOrder/)
  assert.match(service, /\/api\/payments\/paypal\/create-order/)
  assert.match(service, /\/api\/payments\/paypal\/capture-order/)
  assert.match(example, /VITE_PAYPAL_CLIENT_ID=/)
  assert.match(csp, /paypalobjects\.com/)
  assert.match(csp, /child-src/)
  assert.match(csp, /Cross-Origin-Opener-Policy "same-origin-allow-popups"/)
  assert.doesNotMatch(button + checkout + service + example, /PAYPAL_CLIENT_SECRET/)
})

test('checkout exposes only PayPal and cash on delivery with production copy', async () => {
  const form = await readFile(new URL('../src/components/CheckoutForm.jsx', import.meta.url), 'utf8')
  const checkout = await readFile(new URL('../src/pages/Checkout.jsx', import.meta.url), 'utf8')
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const service = await readFile(new URL('../src/services/orderService.js', import.meta.url), 'utf8')
  const visibleFlow = form + checkout

  assert.match(form, /id: 'cash_on_delivery'/)
  assert.match(form, /id: 'paypal'/)
  assert.match(form, /Paga al momento de recibir tu pedido\./)
  assert.match(form, /Paga de forma segura con tu cuenta PayPal\./)
  assert.doesNotMatch(visibleFlow, /PayPhone|Sandbox|demostraci[oó]n|demo_card|\bmock\b|Tarjeta de/iu)
  assert.doesNotMatch(app + service, /MockPayphoneCheckout|mock-payphone|preparePayphonePayment|confirmPayphonePayment/)
  assert.match(checkout, /provider: 'cash_on_delivery'/)
  assert.match(await readFile(new URL('../src/utils/checkout.js', import.meta.url), 'utf8'), /\['cash_on_delivery', 'paypal'\]/)
  assert.match(checkout, /createPaypalOrder/)
  assert.match(checkout, /capturePaypalOrder/)
  const labels = await readFile(new URL('../src/utils/orders.js', import.meta.url), 'utf8')
  assert.match(labels, /Pendiente de pago al entregar/)
  assert.match(labels, /Pago al recibir/)
})

test('admin products support active, hidden and safe deletion actions', async () => {
  const table = await readFile(new URL('../src/components/ProductTable.jsx', import.meta.url), 'utf8')
  const admin = await readFile(new URL('../src/pages/Admin.jsx', import.meta.url), 'utf8')
  assert.match(admin, /import ProductTable from '..\/components\/ProductTable'/)
  assert.match(admin, /<ProductTable \/>/)
  assert.doesNotMatch(admin, /function ProductAdminCard/)
  assert.match(table, /\/api\/products\/admin/)
  assert.match(table, /\/api\/products\/\$\{product\.id\}\/status/)
  assert.match(table, /Activos/)
  assert.match(table, /Ocultos/)
  assert.match(table, /Todos/)
  assert.match(table, /PRODUCT_HAS_HISTORY/)
  assert.match(table, /Eliminar definitivamente/)
  assert.match(table, /Ocultar producto/)
  assert.match(table, /ACTIVO/)
  assert.match(table, /OCULTO/)
})
