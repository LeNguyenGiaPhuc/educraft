import { AppError } from '../../common/errors.js'

const SUBMISSION_FILE_COLUMNS = [
  'id',
  'submission_id',
  'storage_path',
  'original_filename',
  'mime_type',
  'size_bytes',
  'page_order',
  'created_at',
].join(',')

const rpcErrors = Object.freeze({
  AUTH_REQUIRED: [401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập.'],
  SUBMISSION_ROLE_FORBIDDEN: [403, 'FORBIDDEN', 'Bạn không có quyền nộp bài.'],
  ASSIGNMENT_NOT_FOUND: [404, 'ASSIGNMENT_NOT_FOUND', 'Không tìm thấy bài kiểm tra.'],
  STUDENT_NOT_ENROLLED: [403, 'CLASS_MEMBERSHIP_REQUIRED', 'Bạn không thuộc lớp của bài kiểm tra này.'],
  ASSIGNMENT_DRAFT: [409, 'ASSIGNMENT_DRAFT', 'Bài kiểm tra chưa được mở.'],
  ASSIGNMENT_CLOSED: [409, 'ASSIGNMENT_CLOSED', 'Bài kiểm tra đã đóng.'],
  ASSIGNMENT_EXPIRED: [409, 'ASSIGNMENT_EXPIRED', 'Đã hết hạn nộp bài.'],
})

function requireStudentContext(auth) {
  if (
    auth?.profile?.role !== 'STUDENT'
    || typeof auth.profile.id !== 'string'
    || !auth.profile.id
    || !auth.supabase
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền nộp bài.')
  }

  return {
    studentId: auth.profile.id,
    supabase: auth.supabase,
  }
}

function mapRpcError(error) {
  const mapped = rpcErrors[error?.message]
  if (mapped) return new AppError(...mapped)

  return new AppError(500, 'SUBMISSION_CREATE_FAILED', 'Không thể tạo lượt nộp bài.')
}

function toStorageUploadError(error) {
  if (error instanceof AppError) return error

  return new AppError(500, 'STORAGE_UPLOAD_FAILED', 'Không thể lưu file ảnh.')
}

function normalizeSubmission(data) {
  return Array.isArray(data) ? data[0] : data
}

function validateCreatedSubmission(submission, assignmentId, studentId) {
  if (
    !submission?.id
    || submission.assignment_id !== assignmentId
    || submission.student_id !== studentId
    || !Number.isInteger(submission.attempt_number)
    || submission.attempt_number < 1
  ) {
    throw new AppError(500, 'INVALID_SUBMISSION_RESULT', 'Không thể xác nhận lượt nộp bài.')
  }

  return submission
}

function fileMetadata(submissionId, uploaded) {
  return {
    submission_id: submissionId,
    storage_path: uploaded.path,
    original_filename: uploaded.originalFilename,
    mime_type: uploaded.mimeType,
    size_bytes: uploaded.sizeBytes,
    page_order: 1,
  }
}

export function createSubmissionService({ adminClient, storageService, logger = console }) {
  async function deleteTemporarySubmission(submissionId) {
    const result = await adminClient
      .from('submissions')
      .delete()
      .eq('id', submissionId)

    if (result.error) throw result.error
  }

  function logCleanupFailure(event, submissionId, error, uploaded) {
    logger.error({
      event,
      submissionId,
      bucket: uploaded?.bucket,
      path: uploaded?.path,
      errorCode: error?.code ?? 'UNKNOWN_CLEANUP_ERROR',
    })
  }

  async function rollbackSubmission(submissionId, originalError) {
    try {
      await deleteTemporarySubmission(submissionId)
    } catch (cleanupError) {
      logCleanupFailure('submission_row_rollback_failed', submissionId, cleanupError)
      throw new AppError(
        500,
        'SUBMISSION_ROLLBACK_FAILED',
        'Không thể hoàn tác lượt nộp bài chưa hoàn chỉnh.',
      )
    }

    throw originalError
  }

  async function rollbackFileAndSubmission(submissionId, uploaded) {
    const cleanupResults = await Promise.allSettled([
      storageService.rollbackUploadedFile(uploaded),
      deleteTemporarySubmission(submissionId),
    ])
    const failures = cleanupResults.filter((result) => result.status === 'rejected')

    cleanupResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        logCleanupFailure(
          index === 0 ? 'submission_file_rollback_failed' : 'submission_row_rollback_failed',
          submissionId,
          result.reason,
          uploaded,
        )
      }
    })

    if (failures.length > 0) {
      throw new AppError(
        500,
        'SUBMISSION_ROLLBACK_FAILED',
        'Không thể hoàn tác đầy đủ lượt nộp bài chưa hoàn chỉnh.',
      )
    }
  }

  return {
    async createSubmission(auth, assignmentId, file) {
      const { studentId, supabase } = requireStudentContext(auth)
      let rpcResult
      try {
        rpcResult = await supabase.rpc('create_submission_attempt', {
          target_assignment_id: assignmentId,
        })
      } catch (rpcError) {
        throw mapRpcError(rpcError)
      }

      if (rpcResult.error) throw mapRpcError(rpcResult.error)

      const submission = validateCreatedSubmission(
        normalizeSubmission(rpcResult.data),
        assignmentId,
        studentId,
      )

      let uploaded
      try {
        uploaded = await storageService.uploadSubmissionFile({
          client: supabase,
          submissionId: submission.id,
          file,
        })
      } catch (uploadError) {
        await rollbackSubmission(submission.id, toStorageUploadError(uploadError))
      }

      let metadataResult
      try {
        metadataResult = await supabase
          .from('submission_files')
          .insert(fileMetadata(submission.id, uploaded))
          .select(SUBMISSION_FILE_COLUMNS)
          .single()
      } catch {
        await rollbackFileAndSubmission(submission.id, uploaded)
        throw new AppError(
          500,
          'SUBMISSION_FILE_METADATA_FAILED',
          'Không thể lưu thông tin file bài nộp.',
        )
      }

      if (metadataResult.error) {
        await rollbackFileAndSubmission(submission.id, uploaded)
        throw new AppError(
          500,
          'SUBMISSION_FILE_METADATA_FAILED',
          'Không thể lưu thông tin file bài nộp.',
        )
      }

      return {
        ...submission,
        file: metadataResult.data,
      }
    },
  }
}
