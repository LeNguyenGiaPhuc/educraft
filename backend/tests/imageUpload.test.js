import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import {
  MAX_IMAGE_SIZE_BYTES,
  createRequiredImageUpload,
  validateImageFile,
} from '../src/modules/storage/imageUpload.js'

const frontendOrigin = 'http://localhost:5173'
const signatures = {
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/webp': Buffer.from('RIFF0000WEBP'),
}

function buildUploadApp() {
  return createApp({
    frontendOrigin,
    registerRoutes(expressApp) {
      expressApp.post('/api/upload', createRequiredImageUpload(), (requestValue, response) => {
        response.json({
          data: {
            mimeType: requestValue.file.mimetype,
            sizeBytes: requestValue.file.size,
          },
        })
      })
    },
    logger: { error() {} },
  })
}

test('required image upload accepts JPEG, PNG, and WebP signatures', async () => {
  for (const [mimeType, buffer] of Object.entries(signatures)) {
    const response = await request(buildUploadApp())
      .post('/api/upload')
      .set('Origin', frontendOrigin)
      .attach('file', buffer, { filename: 'image.bin', contentType: mimeType })

    assert.equal(response.status, 200, mimeType)
    assert.equal(response.body.data.mimeType, mimeType)
    assert.equal(response.body.data.sizeBytes, buffer.length)
  }
})

test('an image exactly at the 5 MB limit is accepted', async () => {
  const buffer = Buffer.alloc(MAX_IMAGE_SIZE_BYTES)
  signatures['image/jpeg'].copy(buffer)

  const response = await request(buildUploadApp())
    .post('/api/upload')
    .set('Origin', frontendOrigin)
    .attach('file', buffer, { filename: 'limit.jpg', contentType: 'image/jpeg' })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.sizeBytes, MAX_IMAGE_SIZE_BYTES)
})

test('unsupported browser MIME type is rejected without exposing Multer details', async () => {
  const response = await request(buildUploadApp())
    .post('/api/upload')
    .set('Origin', frontendOrigin)
    .attach('file', Buffer.from('%PDF'), { filename: 'document.pdf', contentType: 'application/pdf' })

  assert.equal(response.status, 400)
  assert.deepEqual(response.body.error, {
    code: 'UNSUPPORTED_IMAGE_TYPE',
    message: 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.',
  })
})

test('declared MIME must match the detected image signature', async () => {
  const response = await request(buildUploadApp())
    .post('/api/upload')
    .set('Origin', frontendOrigin)
    .attach('file', signatures['image/png'], {
      filename: 'pretends-to-be-jpeg.jpg',
      contentType: 'image/jpeg',
    })

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'IMAGE_TYPE_MISMATCH')
})

test('empty and malformed image content is rejected', () => {
  assert.throws(
    () => validateImageFile({
      buffer: Buffer.alloc(0),
      mimetype: 'image/png',
      originalname: 'empty.png',
    }),
    (error) => error.code === 'EMPTY_IMAGE',
  )
  assert.throws(
    () => validateImageFile({
      buffer: Buffer.from('not-an-image'),
      mimetype: 'image/png',
      originalname: 'broken.png',
    }),
    (error) => error.code === 'INVALID_IMAGE_CONTENT',
  )
})

test('images above 5 MB are rejected with the shared error shape', async () => {
  const buffer = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1)
  signatures['image/jpeg'].copy(buffer)

  const response = await request(buildUploadApp())
    .post('/api/upload')
    .set('Origin', frontendOrigin)
    .attach('file', buffer, { filename: 'too-large.jpg', contentType: 'image/jpeg' })

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'IMAGE_TOO_LARGE')
  assert.equal(Object.hasOwn(response.body.error, 'field'), false)
})

test('a required upload rejects a missing file', async () => {
  const response = await request(buildUploadApp())
    .post('/api/upload')
    .set('Origin', frontendOrigin)

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'IMAGE_REQUIRED')
})
