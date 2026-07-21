import { HttpError } from '../utils/errors.js'
import { serializeMoney } from '../utils/validation.js'

export class InvoiceService {
  constructor(prisma, provider, storageService, emailService) { this.prisma = prisma; this.provider = provider; this.storageService = storageService; this.emailService = emailService }
  authorize(invoice, user) { if (user.role !== 'ADMIN' && invoice.order.userId !== user.id) throw new HttpError(403, 'Forbidden') }
  async get(id, user) { const row = await this.prisma.invoice.findUnique({ where: { id: Number(id) }, include: { order: true, events: true } }); if (!row) throw new HttpError(404, 'Invoice not found'); this.authorize(row, user); return serializeMoney(row) }
  async byOrder(reference, user) { const row = await this.prisma.invoice.findFirst({ where: { order: { reference: String(reference) } }, include: { order: true, events: true } }); if (!row) throw new HttpError(404, 'Invoice not found'); this.authorize(row, user); return serializeMoney(row) }
  async process(id) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: Number(id) }, include: { order: { include: { items: true } } } })
    if (!invoice) throw new HttpError(404, 'Invoice not found')
    if (invoice.status === 'AUTHORIZED') return invoice
    if (!['PAID', 'INVOICE_PENDING'].includes(invoice.order.status)) throw new HttpError(409, 'Invoice requires a paid order')
    await this.prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'PROCESSING' } })
    try {
      const result = await this.provider.issueInvoice({ order: invoice.order })
      const [xml, ride] = await Promise.all([this.storageService.putInvoice({ type: 'xml', body: result.xml }), this.storageService.putInvoice({ type: 'ride', body: result.ride })])
      const updated = await this.prisma.$transaction(async (tx) => {
        const row = await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'AUTHORIZED', accessKey: result.accessKey, authorizationNumber: result.authorizationNumber, xmlS3Key: xml.key, rideS3Key: ride.key, providerResponse: { mock: Boolean(result.mock) }, issuedAt: new Date(), authorizedAt: new Date() } })
        await tx.invoiceEvent.create({ data: { invoiceId: invoice.id, eventType: 'AUTHORIZED', providerEventId: result.authorizationNumber, message: result.mock ? 'DEMO invoice generated' : 'Invoice authorized' } })
        await tx.order.update({ where: { id: invoice.orderId }, data: { status: 'INVOICED' } })
        return row
      })
      await this.emailService.send({ to: invoice.order.customerEmail, template: 'invoice-authorized', reference: invoice.order.reference })
      return updated
    } catch (error) {
      await this.prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'ERROR', events: { create: { eventType: 'ERROR', message: 'Invoice provider failed' } } } })
      throw error
    }
  }
  async signed(id, type, user) { const invoice = await this.prisma.invoice.findUnique({ where: { id: Number(id) }, include: { order: true } }); if (!invoice) throw new HttpError(404, 'Invoice not found'); this.authorize(invoice, user); const key = type === 'xml' ? invoice.xmlS3Key : invoice.rideS3Key; if (!key) throw new HttpError(409, 'Invoice document is not ready'); return { url: await this.storageService.signedInvoice(key), expiresIn: 300, demo: invoice.provider === 'mock' } }
}
