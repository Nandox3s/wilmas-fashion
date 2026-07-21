import { HttpError } from '../utils/errors.js'

export function createInvoiceWorker(invoiceService) {
  return async function handleInvoiceMessage(message) {
    if (!message || message.type !== 'ISSUE_INVOICE' || !Number.isInteger(Number(message.orderId)) || !Number.isInteger(Number(message.invoiceId))) {
      throw new HttpError(400, 'Invalid invoice queue message')
    }
    return invoiceService.process(Number(message.invoiceId))
  }
}
