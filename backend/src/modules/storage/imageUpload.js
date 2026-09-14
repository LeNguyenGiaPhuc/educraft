import multer from 'multer'

import { AppError } from '../../common/errors.js'

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
export const IMAGE_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const allowedMimeTypes = new Set(IMAGE_MIME_TYPES)

function hasBytes(buffer, expected, offset = 0) {
  if (buffer.length < offset + expected.length) return false
  return expected.every((byte, index) => buffer[offset + index] === byte)
}

export function detectImageMimeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null

  if (hasBytes(buffer, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg'
  }
  if (hasBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png'
  }
  if (
    hasBytes(buffer, [0x52, 0x49, 0x46, 0x46])
    && hasBytes(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp'
  }

  return null
}

export function validateImageFile(file) {
  if (!file) {
    throw new AppError(400, 'IMAGE_REQUIRED', 'Chọn một file ảnh.')
  }

  const buffer = file.buffer
  const sizeBytes = Buffer.isBuffer(buffer) ? buffer.length : 0
  if (sizeBytes === 0) {
    throw new AppError(400, 'EMPTY_IMAGE', 'File ảnh không được để trống.')
  }
  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    throw new AppError(400, 'IMAGE_TOO_LARGE', 'Kích thước ảnh không được vượt quá 5 MB.')
  }

  const declaredMimeType = String(file.mimetype ?? '').toLowerCase()
  if (!allowedMimeTypes.has(declaredMimeType)) {
    throw new AppError(400, 'UNSUPPORTED_IMAGE_TYPE', 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.')
  }

  const detectedMimeType = detectImageMimeType(buffer)
  if (!detectedMimeType) {
    throw new AppError(400, 'INVALID_IMAGE_CONTENT', 'Nội dung file không phải ảnh hợp lệ.')
  }
  if (detectedMimeType !== declaredMimeType) {
    throw new AppError(
      400,
      'IMAGE_TYPE_MISMATCH',
      'Loại file khai báo không khớp với nội dung ảnh.',
    )
  }

  return {
    ...file,
    mimetype: detectedMimeType,
    size: sizeBytes,
  }
}

function toUploadError(error) {
  if (error instanceof AppError) return error

  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return new AppError(400, 'IMAGE_TOO_LARGE', 'Kích thước ảnh không được vượt quá 5 MB.')
  }

  return new AppError(400, 'INVALID_IMAGE_UPLOAD', 'Không thể đọc file ảnh đã tải lên.')
}

export function createRequiredImageUpload(fieldName = 'file') {
  const upload = multer({
    storage: multer.memoryStorage(),
    // The extra byte lets exactly 5 MB reach the canonical validator while
    // still stopping larger payloads before they are retained in memory.
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES + 1 },
    fileFilter(_request, file, callback) {
      const mimeType = String(file.mimetype ?? '').toLowerCase()
      if (!allowedMimeTypes.has(mimeType)) {
        callback(new AppError(400, 'UNSUPPORTED_IMAGE_TYPE', 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.'))
        return
      }

      callback(null, true)
    },
  }).single(fieldName)

  return function requiredImageUpload(request, response, next) {
    upload(request, response, (error) => {
      if (error) {
        next(toUploadError(error))
        return
      }

      try {
        request.file = validateImageFile(request.file)
        next()
      } catch (validationError) {
        next(toUploadError(validationError))
      }
    })
  }
}
