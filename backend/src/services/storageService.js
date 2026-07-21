import { env } from '../config/env.js'
import { HttpError } from '../utils/errors.js'

const types = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }
export class StorageService {
  constructor(provider) { this.provider = provider }
  validateImage({ mimeType, extension, size }) {
    if (!types[mimeType]?.includes(String(extension).toLowerCase())) throw new HttpError(400, 'Unsupported image type or extension mismatch')
    if (!Number.isInteger(Number(size)) || Number(size) <= 0 || Number(size) > 5 * 1024 * 1024) throw new HttpError(400, 'Image must be between 1 byte and 5 MB')
  }
  async presign(input) { this.validateImage(input); return this.provider.createPresignedUpload(input) }
  async putInvoice({ type, body }) { return this.provider.putObject({ namespace: 'invoices', body, extension: type === 'xml' ? '.xml' : '.pdf' }) }
  async signedInvoice(key) { return this.provider.getSignedDownloadUrl({ key, expiresIn: env.presignedUrlTtl }) }
}
