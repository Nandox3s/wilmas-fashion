import { env } from '../config/env.js'
import { HttpError } from '../utils/errors.js'
import { validateImageMetadata } from '../utils/fileValidation.js'

export class StorageService {
  constructor(provider) { this.provider = provider }
  async presign(input) { validateImageMetadata(input); return this.provider.createPresignedUpload(input) }
  async complete(input) {
    if (!String(input.key || '').startsWith('products/')) throw new HttpError(400, 'Invalid product object key')
    return this.provider.validateUploadedImage(input)
  }
  async putInvoice({ type, body }) { return this.provider.putObject({ namespace: 'invoices', body, extension: type === 'xml' ? '.xml' : '.pdf' }) }
  async signedInvoice(key) { return this.provider.getSignedDownloadUrl({ key, expiresIn: env.presignedUrlTtl }) }
}
