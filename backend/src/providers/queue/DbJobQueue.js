export class DbJobQueue {
  constructor(prisma) {
    this.prisma = prisma
  }

  async send(message) {
    await this.prisma.job.create({
      data: {
        type: String(message.type || 'UNKNOWN'),
        aggregateId: String(message.orderId || message.invoiceId || 'n/a'),
        payload: message,
        status: 'PENDING',
      },
    })

    return { provider: 'postgres', accepted: true }
  }
}
