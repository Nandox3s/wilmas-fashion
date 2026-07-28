export class EmailService {
  constructor(provider) { this.provider = provider }
  async send(message) { return this.provider.send(message) }
}
