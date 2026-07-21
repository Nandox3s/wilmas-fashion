import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'
import { StorageProvider } from './StorageProvider.js'
import { validateImageBytes } from '../../utils/fileValidation.js'

export class LocalStorageProvider extends StorageProvider {
  constructor(root = resolve('uploads')) { super(); this.root = root }
  async putObject({ namespace = 'private', body, extension = '.bin' }) {
    const key = `${namespace}/${randomUUID()}${extension}`
    const path = join(this.root, ...key.split('/'))
    await mkdir(resolve(path, '..'), { recursive: true })
    await writeFile(path, body, { flag: 'wx' })
    return { key }
  }
  async getSignedDownloadUrl({ key }) {
    const path = resolve(this.root, ...key.split('/'))
    const relativePath = relative(resolve(this.root), path)
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) throw new Error('Invalid local storage key')
    const mime = key.endsWith('.xml') ? 'application/xml' : 'application/pdf'
    return `data:${mime};base64,${(await readFile(path)).toString('base64')}`
  }
  async createPresignedUpload({ extension }) {
    const key = `products/${randomUUID()}${extname(extension || '') || '.bin'}`
    return { key, method: 'POST', url: '/api/uploads/complete', expiresIn: 300, local: true }
  }
  async validateUploadedImage({ key, mimeType, size }) {
    const path = resolve(this.root, ...String(key).split('/'))
    const relativePath = relative(resolve(this.root), path)
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) throw new Error('Invalid local storage key')
    const body = await readFile(path)
    validateImageBytes({ buffer: body.subarray(0, 16), mimeType, extension: extname(key), size: Number(size) || body.length })
    return { key, status: 'accepted', private: true }
  }
}
