import { AppError } from '../../common/errors.js'
import {
  REFERENCE_MATERIALS_BUCKET,
  STUDENT_SUBMISSIONS_BUCKET,
} from '../storage/storageService.js'

const DEFAULT_MAX_REFERENCE_IMAGES = 4
const DEFAULT_MAX_TOTAL_BYTES = 15 * 1024 * 1024

function inputLimitError() {
  return new AppError(
    422,
    'AI_INPUT_LIMIT_EXCEEDED',
    'Tổng số ảnh hoặc dung lượng ảnh vượt quá giới hạn đánh giá.',
  )
}

function requireFiles(files, code, message) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new AppError(422, code, message)
  }

  return files
}

function comparableDate(value) {
  const parsed = Date.parse(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
}

function sortFiles(files, orderField) {
  return files
    .map((file, index) => ({ file, index }))
    .sort((left, right) => {
      const leftOrder = Number(left.file[orderField])
      const rightOrder = Number(right.file[orderField])
      const hasLeftOrder = Number.isInteger(leftOrder) && leftOrder > 0
      const hasRightOrder = Number.isInteger(rightOrder) && rightOrder > 0

      if (hasLeftOrder && hasRightOrder && leftOrder !== rightOrder) {
        return leftOrder - rightOrder
      }
      if (hasLeftOrder !== hasRightOrder) return hasLeftOrder ? -1 : 1

      const dateDifference = comparableDate(left.file.created_at)
        - comparableDate(right.file.created_at)
      return dateDifference || left.index - right.index
    })
    .map(({ file }) => file)
}

function fileSize(file) {
  const size = Number(file?.size_bytes)
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new AppError(
      502,
      'AI_INPUT_READ_FAILED',
      'Không thể đọc thông tin file ảnh để đánh giá.',
    )
  }

  return size
}

function buildImageDescriptor(file, order) {
  if (
    typeof file?.storage_path !== 'string'
    || !file.storage_path
    || typeof file.mime_type !== 'string'
    || !file.mime_type.startsWith('image/')
  ) {
    throw new AppError(
      502,
      'AI_INPUT_READ_FAILED',
      'Không thể đọc thông tin file ảnh để đánh giá.',
    )
  }

  return {
    path: file.storage_path,
    mimeType: file.mime_type,
    sizeBytes: fileSize(file),
    order,
  }
}

export function createAiEvaluationInputService({
  adminClient,
  assignmentService,
  referenceService,
  storageService,
  maxReferenceImages = DEFAULT_MAX_REFERENCE_IMAGES,
  maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES,
} = {}) {
  async function downloadImages(descriptors, bucket) {
    return Promise.all(descriptors.map(async (descriptor) => ({
      mimeType: descriptor.mimeType,
      buffer: await storageService.downloadPrivateImage({
        client: adminClient,
        bucket,
        path: descriptor.path,
      }),
      order: descriptor.order,
    })))
  }

  return {
    async loadEvaluationInput(auth, submission) {
      if (!submission?.assignment_id) {
        throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Không tìm thấy bài kiểm tra.')
      }

      const assignment = await assignmentService.getAssignment(auth, submission.assignment_id)
      const references = await referenceService.listReferences(auth, submission.assignment_id)
      const referenceFiles = requireFiles(
        references,
        'AI_REFERENCE_REQUIRED',
        'Bài kiểm tra chưa có bài mẫu để đánh giá.',
      )
      const submissionFiles = requireFiles(
        submission.files,
        'AI_SUBMISSION_IMAGE_REQUIRED',
        'Lượt nộp bài chưa có ảnh để đánh giá.',
      )

      if (!Number.isInteger(maxReferenceImages) || maxReferenceImages < 1) {
        throw new AppError(500, 'AI_INPUT_LIMIT_INVALID', 'Giới hạn ảnh đánh giá chưa được cấu hình.')
      }
      if (!Number.isSafeInteger(maxTotalBytes) || maxTotalBytes < 1) {
        throw new AppError(500, 'AI_INPUT_LIMIT_INVALID', 'Giới hạn dung lượng đánh giá chưa được cấu hình.')
      }
      if (referenceFiles.length > maxReferenceImages) throw inputLimitError()

      const orderedReferences = sortFiles(referenceFiles, 'page_order')
      const orderedSubmissions = sortFiles(submissionFiles, 'page_order')
      const referenceDescriptors = orderedReferences.map((file, index) => (
        buildImageDescriptor(file, index + 1)
      ))
      const submissionDescriptors = orderedSubmissions.map((file, index) => (
        buildImageDescriptor(file, index + 1)
      ))
      const declaredBytes = [
        ...referenceDescriptors,
        ...submissionDescriptors,
      ].reduce((total, descriptor) => total + descriptor.sizeBytes, 0)

      if (declaredBytes > maxTotalBytes) throw inputLimitError()

      const [referenceImages, submissionImages] = await Promise.all([
        downloadImages(referenceDescriptors, REFERENCE_MATERIALS_BUCKET),
        downloadImages(submissionDescriptors, STUDENT_SUBMISSIONS_BUCKET),
      ])
      const actualBytes = [...referenceImages, ...submissionImages]
        .reduce((total, image) => total + image.buffer.length, 0)

      if (actualBytes > maxTotalBytes) throw inputLimitError()

      return {
        assignmentTitle: assignment.title,
        coverageThreshold: assignment.coverage_threshold,
        referenceImages,
        submissionImages,
      }
    },
  }
}
