import { randomUUID } from 'node:crypto'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { StorageProvider } from './StorageProvider.js'
import { extname } from 'node:path'
import { validateImageBytes } from '../../utils/fileValidation.js'

export class S3StorageProvider extends StorageProvider {
  constructor() { super(); this.client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' }) }
  bucket(namespace) { const value = namespace === 'products' ? process.env.S3_PRODUCTS_BUCKET : process.env.S3_INVOICES_BUCKET; if (!value) throw Object.assign(new Error('S3 bucket is not configured'), { status: 503 }); return value }
  async putObject({ namespace = 'invoices', body, extension = '.bin' }) {
    const key = `${namespace}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket(namespace), Key: key, Body: body, ServerSideEncryption: 'AES256', ContentType: extension === '.xml' ? 'application/xml' : extension === '.pdf' ? 'application/pdf' : 'application/octet-stream' }))
    return { key }
  }
  async getSignedDownloadUrl({ key, expiresIn = 300 }) { return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket(key.startsWith('products/') ? 'products' : 'invoices'), Key: key }), { expiresIn }) }
  async createPresignedUpload({ extension, mimeType }) {
    const key = `products/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`
    const url = await getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.bucket('products'), Key: key, ContentType: mimeType, ServerSideEncryption: 'AES256' }), { expiresIn: 300 })
    return { key, method: 'PUT', url, headers: { 'Content-Type': mimeType, 'x-amz-server-side-encryption': 'AES256' }, expiresIn: 300 }
  }
  async validateUploadedImage({ key, mimeType }) {
    const Bucket = this.bucket('products')
    try {
      const [head, object] = await Promise.all([this.client.send(new HeadObjectCommand({ Bucket, Key: key })), this.client.send(new GetObjectCommand({ Bucket, Key: key, Range: 'bytes=0-15' }))])
      const bytes = Buffer.from(await object.Body.transformToByteArray())
      validateImageBytes({ buffer: bytes, mimeType: head.ContentType || mimeType, extension: extname(key), size: head.ContentLength })
      return { key, status: 'accepted', private: true }
    } catch (error) {
      await this.client.send(new DeleteObjectCommand({ Bucket, Key: key })).catch(() => {})
      throw error
    }
  }
}
