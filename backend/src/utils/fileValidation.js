import { extname } from 'node:path'
import { HttpError } from './errors.js'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }

export function detectedImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}

export function validateImageMetadata({ mimeType, extension, size }) {
  const normalizedExtension = String(extension || '').toLowerCase()
  if (!IMAGE_TYPES[mimeType]?.includes(normalizedExtension)) throw new HttpError(400, 'Unsupported image type or extension mismatch')
  if (!Number.isInteger(Number(size)) || Number(size) <= 0 || Number(size) > MAX_IMAGE_BYTES) throw new HttpError(400, 'Image must be between 1 byte and 5 MB')
}

export function validateImageBytes({ buffer, mimeType, extension, size }) {
  validateImageMetadata({ mimeType, extension, size })
  const detected = detectedImageType(buffer)
  if (!detected || detected !== mimeType || !IMAGE_TYPES[detected].includes(extname(String(extension)).toLowerCase() || String(extension).toLowerCase())) throw new HttpError(400, 'File content does not match the declared image type')
  return detected
}
