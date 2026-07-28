import { InvoiceService } from '../services/invoiceService.js'
import { StorageService } from '../services/storageService.js'
import { EmailService } from '../services/emailService.js'
import { DatilProvider } from '../providers/invoices/DatilProvider.js'
import { MockInvoiceProvider } from '../providers/invoices/MockInvoiceProvider.js'
import { S3StorageProvider } from '../providers/storage/S3StorageProvider.js'
import { SesEmailProvider } from '../providers/email/SesEmailProvider.js'
import { ConsoleEmailProvider } from '../providers/email/ConsoleEmailProvider.js'
import { createInvoiceWorker } from './invoiceWorker.js'
import { loadManagedSecrets } from '../config/managedSecrets.js'

let processInvoice
async function worker() {
  if (processInvoice) return processInvoice
  await loadManagedSecrets()
  const { prisma } = await import('../config/prisma.js')
  const invoices = new InvoiceService(
    prisma,
    process.env.INVOICE_PROVIDER === 'datil' ? new DatilProvider() : new MockInvoiceProvider(),
    new StorageService(new S3StorageProvider()),
    new EmailService(process.env.EMAIL_PROVIDER === 'ses' ? new SesEmailProvider() : new ConsoleEmailProvider()),
  )
  processInvoice = createInvoiceWorker(invoices)
  return processInvoice
}

export async function handler(event) {
  const processMessage = await worker()
  const failures = []
  for (const record of event.Records || []) {
    try { await processMessage(JSON.parse(record.body)) }
    catch { failures.push({ itemIdentifier: record.messageId }) }
  }
  return { batchItemFailures: failures }
}
