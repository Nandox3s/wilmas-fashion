import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { logger } from '../../config/logger.js'
import { EmailProvider } from './EmailProvider.js'

const PREVIEW_DIR = resolve('tmp', 'emails')

function summarize(value, max = 500) {
  const text = String(value ?? '')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

const SUBJECTS = {
  'invoice-authorized': 'Tu factura está disponible',
  'order-shipping-registered': 'Tu pedido está siendo preparado',
  'order-shipped': 'Tu pedido fue enviado',
  'order-delivered': 'Tu pedido fue entregado',
  'payment-approved': 'Pago aprobado',
  'payment-rejected': 'Pago rechazado',
}

function invoiceLinks(message) {
  if (!message.invoicePdfUrl && !message.invoiceXmlUrl) return { html: '', text: '' }
  const lines = []
  const htmlLines = []
  if (message.invoicePdfUrl) {
    lines.push(`Descargar PDF: ${message.invoicePdfUrl}`)
    htmlLines.push(`<p><a href="${message.invoicePdfUrl}">Descargar factura PDF</a></p>`)
  }
  if (message.invoiceXmlUrl) {
    lines.push(`Descargar XML: ${message.invoiceXmlUrl}`)
    htmlLines.push(`<p><a href="${message.invoiceXmlUrl}">Descargar factura XML</a></p>`)
  }
  return { html: htmlLines.join(''), text: lines.join('\n') }
}

function trackingSection(message) {
  if (!message.trackingUrl && !message.carrierName && !message.trackingNumber) return { html: '', text: '' }
  const parts = []
  const htmlParts = []
  if (message.carrierName) { parts.push(`Transportista: ${message.carrierName}`); htmlParts.push(`<p>Transportista: ${message.carrierName}</p>`) }
  if (message.trackingNumber) { parts.push(`Guía: ${message.trackingNumber}`); htmlParts.push(`<p>Número de guía: ${message.trackingNumber}</p>`) }
  if (message.trackingUrl) { parts.push(`Seguimiento: ${message.trackingUrl}`); htmlParts.push(`<p><a href="${message.trackingUrl}">Ver seguimiento en línea</a></p>`) }
  if (message.estimatedDelivery) { parts.push(`Entrega estimada: ${message.estimatedDelivery}`); htmlParts.push(`<p>Entrega estimada: ${message.estimatedDelivery}</p>`) }
  return { html: htmlParts.join(''), text: parts.join('\n') }
}

function renderTemplate(message) {
  const subject = SUBJECTS[message.template] || 'Actualización de Wilmas Fashion'
  const reference = summarize(message.reference || 'N/A', 80)
  const links = invoiceLinks(message)
  const tracking = trackingSection(message)

  const text = [
    subject,
    `Referencia: ${reference}`,
    message.orderId ? `Pedido: ${message.orderId}` : null,
    links.text || null,
    tracking.text || null,
    'No compartas contraseñas, tokens ni información bancaria.',
  ].filter(Boolean).join('\n')

  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;max-width:600px">',
    `<h1 style="color:#28161e">${subject}</h1>`,
    `<p><strong>Referencia:</strong> ${reference}</p>`,
    message.orderId ? `<p><strong>Pedido:</strong> ${message.orderId}</p>` : '',
    links.html,
    tracking.html,
    '<p style="color:#705d65;font-size:0.85em">No compartas contraseñas, tokens ni información bancaria.</p>',
    '</div>',
  ].join('')

  return { subject, text, html }
}

export class ConsoleEmailProvider extends EmailProvider {
  async send(message) {
    const preview = renderTemplate(message)
    const recipientDomain = String(message.to || '').split('@')[1] || 'invalid'
    await mkdir(PREVIEW_DIR, { recursive: true })
    const record = {
      createdAt: new Date().toISOString(),
      provider: 'console',
      template: message.template || 'generic',
      recipientDomain,
      reference: summarize(message.reference || ''),
      subject: preview.subject,
      // Store text/html in preview file but do NOT log them to console
      text: preview.text,
      html: preview.html,
      status: 'SENT',
    }
    const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.json`
    await writeFile(resolve(PREVIEW_DIR, filename), `${JSON.stringify(record, null, 2)}\n`, 'utf8')
    // Log only metadata — never the full HTML, XML, or PDF content
    logger.info('email_demo', {
      recipientDomain,
      template: message.template,
      reference: summarize(message.reference || ''),
      preview: filename,
    })
    return { provider: 'console', accepted: true, demo: true, preview: { subject: preview.subject } }
  }
}
