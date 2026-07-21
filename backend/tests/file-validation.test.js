import test from 'node:test'
import assert from 'node:assert/strict'
import { detectedImageType, validateImageBytes, validateImageMetadata } from '../src/utils/fileValidation.js'

test('detects supported image magic bytes', () => {
  assert.equal(detectedImageType(Buffer.from([0xff, 0xd8, 0xff, ...Array(9).fill(0)])), 'image/jpeg')
  assert.equal(detectedImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])), 'image/png')
  assert.equal(detectedImageType(Buffer.from('RIFF0000WEBP')), 'image/webp')
})

test('rejects spoofed image content and extension mismatches', () => {
  assert.throws(() => validateImageBytes({ buffer: Buffer.from('not an image'), mimeType: 'image/png', extension: '.png', size: 12 }), /does not match/)
  assert.throws(() => validateImageMetadata({ mimeType: 'image/png', extension: '.jpg', size: 12 }), /mismatch/)
  assert.throws(() => validateImageMetadata({ mimeType: 'image/png', extension: '.png', size: 5 * 1024 * 1024 + 1 }), /5 MB/)
})
