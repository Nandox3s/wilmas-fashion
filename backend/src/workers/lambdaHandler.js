import { prisma } from '../config/prisma.js'
import { InvoiceService } from '../services/invoiceService.js'
import { StorageService } from '../services/storageService.js'
import { EmailService } from '../services/emailService.js'
import { DatilProvider } from '../providers/invoices/DatilProvider.js'
import { MockInvoiceProvider } from '../providers/invoices/MockInvoiceProvider.js'
import { S3StorageProvider } from '../providers/storage/S3StorageProvider.js'
import { SesEmailProvider } from '../providers/email/SesEmailProvider.js'
import { ConsoleEmailProvider } from '../providers/email/ConsoleEmailProvider.js'
import { createInvoiceWorker } from './invoiceWorker.js'

const invoices = new InvoiceService(
  prisma,
  process.env.INVOICE_PROVIDER === 'datil' ? new DatilProvider() : new MockInvoiceProvider(),
  new StorageService(new S3StorageProvider()),
  new EmailService(process.env.EMAIL_PROVIDER === 'ses' ? new SesEmailProvider() : new ConsoleEmailProvider()),
)
const processInvoice = createInvoiceWorker(invoices)

export async function handler(event) {
  const failures = []
  for (const record of event.Records || []) {
    try { await processInvoice(JSON.parse(record.body)) }
    catch { failures.push({ itemIdentifier: record.messageId }) }
  }
  return { batchItemFailures: failures }
}
