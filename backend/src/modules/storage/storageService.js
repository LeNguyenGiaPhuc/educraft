import { randomUUID } from 'node:crypto'

import { AppError } from '../../common/errors.js'
import { validateImageFile } from './imageUpload.js'

export const REFERENCE_MATERIALS_BUCKET = 'reference-materials'
export const STUDENT_SUBMISSIONS_BUCKET = 'student-submissions'
export const SIGNED_URL_EXPIRES_IN_SECONDS = 300

const extensionsByMimeType = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
})
const resourceIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const objectPathPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[a-zA-Z0-9_-]+\.(?:jpg|png|webp)$/

function requireStorageClient(client) {
  if (!client?.storage?.from) {
    throw new AppError(500, 'STORAGE_NOT_CONFIGURED', 'Dịch vụ lưu trữ chưa sẵn sàng.')
  }

  return client
}

function validateResourceId(resourceId) {
  if (!resourceIdPattern.test(String(resourceId ?? ''))) {
    throw new AppError(400, 'INVALID_STORAGE_RESOURCE', 'Tài nguyên lưu file không hợp lệ.')
  }

  return resourceId
}

function validateOriginalFilename(originalname) {
  const filename = String(originalname ?? '')
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    throw new AppError(400, 'INVALID_IMAGE_FILENAME', 'Tên file ảnh không hợp lệ.')
  }

  return filename
}

function validateObjectPath(path) {
  if (!objectPathPattern.test(String(path ?? ''))) {
    throw new AppError(400, 'INVALID_STORAGE_PATH', 'Đường dẫn file lưu trữ không hợp lệ.')
  }

  return path
}

function validateBucket(bucket) {
  if (![REFERENCE_MATERIALS_BUCKET, STUDENT_SUBMISSIONS_BUCKET].includes(bucket)) {
    throw new AppError(400, 'INVALID_STORAGE_BUCKET', 'Bucket lưu trữ không hợp lệ.')
  }

  return bucket
}

export function createStorageService({ adminClient, createFileId = randomUUID } = {}) {
  function buildUpload(bucket, resourceId, file, input) {
    if (Object.hasOwn(input, 'path') || Object.hasOwn(input, 'bucket')) {
      throw new AppError(400, 'CLIENT_STORAGE_PATH_FORBIDDEN', 'Đường dẫn lưu file do hệ thống tạo.')
    }

    const validatedResourceId = validateResourceId(resourceId)
    const validatedFile = validateImageFile(file)
    const originalFilename = validateOriginalFilename(validatedFile.originalname)
    const extension = extensionsByMimeType[validatedFile.mimetype]
    const generatedId = String(createFileId())

    if (!/^[a-zA-Z0-9_-]+$/.test(generatedId)) {
      throw new AppError(500, 'INVALID_GENERATED_FILENAME', 'Không thể tạo tên file lưu trữ.')
    }

    const fileName = `${generatedId}.${extension}`
    const path = `${validatedResourceId}/${fileName}`

    return {
      bucket,
      path,
      fullPath: `${bucket}/${path}`,
      fileName,
      originalFilename,
      mimeType: validatedFile.mimetype,
      sizeBytes: validatedFile.size,
      buffer: validatedFile.buffer,
    }
  }

  async function upload(client, details) {
    const storageClient = requireStorageClient(client)
    const result = await storageClient.storage
      .from(details.bucket)
      .upload(details.path, details.buffer, {
        contentType: details.mimeType,
        upsert: false,
      })

    if (result.error) {
      throw new AppError(500, 'STORAGE_UPLOAD_FAILED', 'Không thể lưu file ảnh.')
    }

    return {
      bucket: details.bucket,
      path: details.path,
      fullPath: details.fullPath,
      fileName: details.fileName,
      originalFilename: details.originalFilename,
      mimeType: details.mimeType,
      sizeBytes: details.sizeBytes,
    }
  }

  async function remove(client, bucket, path) {
    const storageClient = requireStorageClient(client)
    const validatedPath = validateObjectPath(path)
    const result = await storageClient.storage.from(bucket).remove([validatedPath])

    if (result.error) {
      throw new AppError(500, 'STORAGE_REMOVE_FAILED', 'Không thể xóa file ảnh khỏi lưu trữ.')
    }

    return { bucket, path: validatedPath, fullPath: `${bucket}/${validatedPath}` }
  }

  async function createSignedUrl(client, bucket, path) {
    const storageClient = requireStorageClient(client)
    const validatedBucket = validateBucket(bucket)
    const validatedPath = validateObjectPath(path)

    let result
    try {
      result = await storageClient.storage
        .from(validatedBucket)
        .createSignedUrl(validatedPath, SIGNED_URL_EXPIRES_IN_SECONDS)
    } catch {
      throw new AppError(
        500,
        'STORAGE_SIGNED_URL_FAILED',
        'Không thể tạo đường dẫn xem file ảnh.',
      )
    }

    if (result.error || !result.data?.signedUrl) {
      throw new AppError(
        500,
        'STORAGE_SIGNED_URL_FAILED',
        'Không thể tạo đường dẫn xem file ảnh.',
      )
    }

    return result.data.signedUrl
  }

  async function downloadPrivateImage(client, bucket, path) {
    const storageClient = requireStorageClient(client)
    const validatedBucket = validateBucket(bucket)
    const validatedPath = validateObjectPath(path)

    let result
    try {
      result = await storageClient.storage
        .from(validatedBucket)
        .download(validatedPath)
    } catch {
      throw new AppError(
        502,
        'AI_INPUT_READ_FAILED',
        'Không thể đọc file ảnh để đánh giá.',
      )
    }

    if (result?.error || !result?.data || typeof result.data.arrayBuffer !== 'function') {
      throw new AppError(
        502,
        'AI_INPUT_READ_FAILED',
        'Không thể đọc file ảnh để đánh giá.',
      )
    }

    let buffer
    try {
      buffer = Buffer.from(await result.data.arrayBuffer())
    } catch {
      throw new AppError(
        502,
        'AI_INPUT_READ_FAILED',
        'Không thể đọc file ảnh để đánh giá.',
      )
    }

    if (buffer.length === 0) {
      throw new AppError(
        502,
        'AI_INPUT_READ_FAILED',
        'Không thể đọc file ảnh để đánh giá.',
      )
    }

    return buffer
  }

  return {
    async uploadReferenceFile({ client, assignmentId, file, ...input }) {
      const details = buildUpload(
        REFERENCE_MATERIALS_BUCKET,
        assignmentId,
        file,
        input,
      )
      return upload(client, details)
    },

    async uploadSubmissionFile({ client, submissionId, file, ...input }) {
      const details = buildUpload(
        STUDENT_SUBMISSIONS_BUCKET,
        submissionId,
        file,
        input,
      )
      return upload(client, details)
    },

    async removeReferenceFile({ client, path }) {
      return remove(client, REFERENCE_MATERIALS_BUCKET, path)
    },

    async removeSubmissionFile({ client, path }) {
      return remove(client, STUDENT_SUBMISSIONS_BUCKET, path)
    },

    async createSignedUrl({ client, bucket, path }) {
      return createSignedUrl(client, bucket, path)
    },

    async downloadPrivateImage({ client, bucket, path }) {
      return downloadPrivateImage(client, bucket, path)
    },

    async rollbackUploadedFile({ bucket, path }) {
      if (![REFERENCE_MATERIALS_BUCKET, STUDENT_SUBMISSIONS_BUCKET].includes(bucket)) {
        throw new AppError(400, 'INVALID_STORAGE_BUCKET', 'Bucket lưu trữ không hợp lệ.')
      }

      return remove(adminClient, bucket, path)
    },
  }
}
