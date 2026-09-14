import { AppError } from '../../common/errors.js'
import { STUDENT_SUBMISSIONS_BUCKET } from '../storage/storageService.js'

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

const SUBMISSION_COLUMNS = [
  'id',
  'assignment_id',
  'student_id',
  'attempt_number',
  'status',
  'submitted_at',
  'created_at',
  'updated_at',
].join(',')

const TEACHER_REVIEW_COLUMNS = [
  'id',
  'final_status',
  'final_score',
  'feedback',
  'is_finalized',
  'finalized_at',
  'updated_at',
].join(',')

const STUDENT_SUBMISSION_SELECT = [
  SUBMISSION_COLUMNS,
  `submission_files(${SUBMISSION_FILE_COLUMNS})`,
  `teacher_reviews(${TEACHER_REVIEW_COLUMNS})`,
].join(',')

const TEACHER_SUBMISSION_SELECT = [
  SUBMISSION_COLUMNS,
  'student:profiles!submissions_student_id_fkey(id,full_name,student_code)',
  `submission_files(${SUBMISSION_FILE_COLUMNS})`,
  `teacher_reviews(${TEACHER_REVIEW_COLUMNS})`,
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

const finalizationRpcErrors = Object.freeze({
  AUTH_REQUIRED: [401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập.'],
  REVIEW_ROLE_FORBIDDEN: [403, 'FORBIDDEN', 'Bạn không có quyền chốt kết quả.'],
  SUBMISSION_NOT_FOUND: [404, 'SUBMISSION_NOT_FOUND', 'Không tìm thấy lượt nộp bài.'],
  CLASS_FORBIDDEN: [403, 'CLASS_FORBIDDEN', 'Bạn không được phân công cho lớp học này.'],
  INVALID_FINAL_STATUS: [400, 'INVALID_FINAL_STATUS', 'Trạng thái kết quả không hợp lệ.'],
  INVALID_FINAL_SCORE: [400, 'INVALID_FINAL_SCORE', 'Điểm cuối phải từ 0 đến 100.'],
  FEEDBACK_REQUIRED: [400, 'FEEDBACK_REQUIRED', 'Nhận xét cuối không được để trống.'],
  SUBMISSION_ALREADY_FINALIZED: [409, 'SUBMISSION_ALREADY_FINALIZED', 'Lượt nộp bài đã được chốt kết quả.'],
  REVIEW_ALREADY_FINALIZED: [409, 'SUBMISSION_ALREADY_FINALIZED', 'Lượt nộp bài đã được chốt kết quả.'],
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

function requireTeacherContext(auth) {
  if (
    auth?.profile?.role !== 'TEACHER'
    || typeof auth.profile.id !== 'string'
    || !auth.profile.id
    || !auth.supabase
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xem lượt nộp bài.')
  }

  return { supabase: auth.supabase }
}

function throwDatabaseError(result) {
  if (result.error) throw result.error
}

function relatedRecord(value) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

async function projectFiles(files, createSignedUrl) {
  if (!Array.isArray(files)) return []

  return Promise.all(files.map(async (file) => ({
    id: file.id,
    storage_path: file.storage_path,
    signed_url: await createSignedUrl(file.storage_path),
    original_filename: file.original_filename,
    mime_type: file.mime_type,
    size_bytes: file.size_bytes,
    page_order: file.page_order,
    created_at: file.created_at,
  })))
}

async function projectSubmissionBase(submission, createSignedUrl) {
  return {
    id: submission.id,
    assignment_id: submission.assignment_id,
    attempt_number: submission.attempt_number,
    status: submission.status,
    submitted_at: submission.submitted_at,
    files: await projectFiles(submission.submission_files, createSignedUrl),
  }
}

async function projectStudentSubmission(submission, createSignedUrl) {
  const projected = await projectSubmissionBase(submission, createSignedUrl)
  const review = relatedRecord(submission.teacher_reviews)

  if (review?.is_finalized === true) {
    projected.teacher_result = {
      final_status: review.final_status,
      final_score: review.final_score,
      feedback: review.feedback,
      is_finalized: true,
      finalized_at: review.finalized_at,
    }
  }

  return projected
}

async function projectTeacherSubmission(submission, createSignedUrl) {
  const review = relatedRecord(submission.teacher_reviews)
  const student = relatedRecord(submission.student)
  const base = await projectSubmissionBase(submission, createSignedUrl)

  return {
    ...base,
    student_id: submission.student_id,
    created_at: submission.created_at,
    updated_at: submission.updated_at,
    student: student ? {
      id: student.id,
      full_name: student.full_name,
      student_code: student.student_code,
    } : null,
    teacher_review: review ? {
      id: review.id,
      final_status: review.final_status,
      final_score: review.final_score,
      feedback: review.feedback,
      is_finalized: review.is_finalized,
      finalized_at: review.finalized_at,
      updated_at: review.updated_at,
    } : null,
  }
}

function mapRpcError(error) {
  const mapped = rpcErrors[error?.message]
  if (mapped) return new AppError(...mapped)

  return new AppError(500, 'SUBMISSION_CREATE_FAILED', 'Không thể tạo lượt nộp bài.')
}

function mapFinalizationRpcError(error) {
  const mapped = finalizationRpcErrors[error?.message]
  if (mapped) return new AppError(...mapped)

  return new AppError(500, 'FINALIZATION_FAILED', 'Không thể chốt kết quả lượt nộp bài.')
}

function normalizeReview(data) {
  return Array.isArray(data) ? data[0] : data
}

function validateFinalizedReview(review, submissionId, teacherId, input) {
  if (
    !review?.id
    || review.submission_id !== submissionId
    || review.teacher_id !== teacherId
    || review.final_status !== input.final_status
    || review.feedback !== input.feedback
    || review.is_finalized !== true
    || !review.finalized_at
  ) {
    throw new AppError(
      500,
      'INVALID_FINALIZATION_RESULT',
      'Không thể xác nhận kết quả đã chốt.',
    )
  }

  const expectedScore = input.final_score ?? null
  if (review.final_score !== expectedScore) {
    throw new AppError(
      500,
      'INVALID_FINALIZATION_RESULT',
      'Không thể xác nhận kết quả đã chốt.',
    )
  }

  return review
}

function projectFinalization(review) {
  return {
    submission_id: review.submission_id,
    submission_status: 'FINALIZED',
    teacher_review: {
      id: review.id,
      final_status: review.final_status,
      final_score: review.final_score,
      feedback: review.feedback,
      is_finalized: true,
      finalized_at: review.finalized_at,
    },
  }
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

export function createSubmissionService({
  adminClient,
  assignmentService,
  storageService,
  logger = console,
}) {
  function createSubmissionFileSignedUrl(supabase) {
    return (path) => storageService.createSignedUrl({
      client: supabase,
      bucket: STUDENT_SUBMISSIONS_BUCKET,
      path,
    })
  }

  async function requireStudentAssignmentAccess(supabase, studentId, assignmentId) {
    const assignmentResult = await supabase
      .from('assignments')
      .select('id,class_id')
      .eq('id', assignmentId)
      .maybeSingle()

    throwDatabaseError(assignmentResult)

    if (!assignmentResult.data) {
      throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Không tìm thấy bài kiểm tra.')
    }

    const membershipResult = await supabase
      .from('class_members')
      .select('class_id,student_id')
      .eq('class_id', assignmentResult.data.class_id)
      .eq('student_id', studentId)
      .maybeSingle()

    throwDatabaseError(membershipResult)

    if (!membershipResult.data) {
      throw new AppError(
        403,
        'CLASS_MEMBERSHIP_REQUIRED',
        'Bạn không còn thuộc lớp của bài kiểm tra này.',
      )
    }
  }

  async function findSubmission(supabase, submissionId, select, studentId) {
    let query = supabase
      .from('submissions')
      .select(select)
      .eq('id', submissionId)

    if (studentId) query = query.eq('student_id', studentId)

    const result = await query.maybeSingle()
    throwDatabaseError(result)

    if (!result.data) {
      throw new AppError(404, 'SUBMISSION_NOT_FOUND', 'Không tìm thấy lượt nộp bài.')
    }

    if (studentId && result.data.student_id !== studentId) {
      throw new AppError(404, 'SUBMISSION_NOT_FOUND', 'Không tìm thấy lượt nộp bài.')
    }

    return result.data
  }

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
    async finalizeSubmission(auth, submissionId, input) {
      const { supabase } = requireTeacherContext(auth)
      const teacherId = auth.profile.id
      let rpcResult

      try {
        rpcResult = await supabase.rpc('finalize_submission_review', {
          target_submission_id: submissionId,
          target_final_status: input.final_status,
          target_final_score: input.final_score ?? null,
          target_feedback: input.feedback,
        })
      } catch (rpcError) {
        throw mapFinalizationRpcError(rpcError)
      }

      if (rpcResult.error) throw mapFinalizationRpcError(rpcResult.error)

      const review = validateFinalizedReview(
        normalizeReview(rpcResult.data),
        submissionId,
        teacherId,
        input,
      )
      return projectFinalization(review)
    },

    async listOwnSubmissions(auth, assignmentId) {
      const { studentId, supabase } = requireStudentContext(auth)
      await requireStudentAssignmentAccess(supabase, studentId, assignmentId)

      const result = await supabase
        .from('submissions')
        .select(STUDENT_SUBMISSION_SELECT)
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .order('attempt_number', { ascending: true })
        .order('submitted_at', { ascending: true })
        .order('id', { ascending: true })

      throwDatabaseError(result)
      const submissions = (result.data ?? [])
        .filter((submission) => (
          submission.assignment_id === assignmentId
          && submission.student_id === studentId
        ))

      return Promise.all(
        submissions.map((submission) => (
          projectStudentSubmission(submission, createSubmissionFileSignedUrl(supabase))
        )),
      )
    },

    async listAssignmentSubmissions(auth, assignmentId) {
      const { supabase } = requireTeacherContext(auth)
      await assignmentService.getAssignment(auth, assignmentId)

      const result = await supabase
        .from('submissions')
        .select(TEACHER_SUBMISSION_SELECT)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: true })
        .order('student_id', { ascending: true })
        .order('attempt_number', { ascending: true })
        .order('id', { ascending: true })

      throwDatabaseError(result)
      const submissions = (result.data ?? [])
        .filter((submission) => submission.assignment_id === assignmentId)

      return Promise.all(
        submissions.map((submission) => (
          projectTeacherSubmission(submission, createSubmissionFileSignedUrl(supabase))
        )),
      )
    },

    async getSubmission(auth, submissionId) {
      if (auth?.profile?.role === 'STUDENT') {
        const { studentId, supabase } = requireStudentContext(auth)
        const submission = await findSubmission(
          supabase,
          submissionId,
          STUDENT_SUBMISSION_SELECT,
          studentId,
        )
        await requireStudentAssignmentAccess(
          supabase,
          studentId,
          submission.assignment_id,
        )
        return projectStudentSubmission(
          submission,
          createSubmissionFileSignedUrl(supabase),
        )
      }

      if (auth?.profile?.role === 'TEACHER') {
        const { supabase } = requireTeacherContext(auth)
        const submission = await findSubmission(
          supabase,
          submissionId,
          TEACHER_SUBMISSION_SELECT,
        )
        await assignmentService.getAssignment(auth, submission.assignment_id)
        return projectTeacherSubmission(
          submission,
          createSubmissionFileSignedUrl(supabase),
        )
      }

      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xem lượt nộp bài.')
    },

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
