import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
export class SqsInvoiceQueue {
  constructor() { this.client = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' }) }
  async send(message) {
    if (!process.env.SQS_INVOICE_QUEUE_URL) throw Object.assign(new Error('SQS_INVOICE_QUEUE_URL is not configured'), { status: 503 })
    const response = await this.client.send(new SendMessageCommand({ QueueUrl: process.env.SQS_INVOICE_QUEUE_URL, MessageBody: JSON.stringify(message) }))
    return { provider: 'sqs', accepted: Boolean(response.MessageId) }
  }
}
