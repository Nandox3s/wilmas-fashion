import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { EmailProvider } from './EmailProvider.js'

const subjects = { 'order-created': 'Pedido recibido', 'payment-approved': 'Pago confirmado', 'payment-rejected': 'Pago no aprobado', 'invoice-authorized': 'Documento disponible', 'invoice-error': 'Documento en proceso' }
export class SesEmailProvider extends EmailProvider {
  constructor() { super(); this.client = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-1' }) }
  async send({ to, template, reference }) {
    if (!process.env.SES_FROM_EMAIL) throw Object.assign(new Error('SES_FROM_EMAIL is not configured'), { status: 503 })
    const subject = subjects[template] || 'Actualización de Wilmas Fashion'; const body = `${subject}. Referencia: ${reference}. No respondas con información financiera o contraseñas.`
    const response = await this.client.send(new SendEmailCommand({ FromEmailAddress: process.env.SES_FROM_EMAIL, Destination: { ToAddresses: [to] }, Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Text: { Data: body, Charset: 'UTF-8' } } } } }))
    return { provider: 'ses', accepted: Boolean(response.MessageId) }
  }
}
