const STATUS_MAP = Object.freeze({
  SUBMITTED: 'submitted',
  PROCESSING: 'processing',
  REQUIRES_REVIEW: 'awaiting_review',
  FINALIZED: 'approved',
})

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isBackendAssignmentId(value) {
  return UUID_PATTERN.test(String(value ?? '').trim())
}

function normalizeFinalStatus(value) {
  return String(value ?? '').trim().toLowerCase()
}

function getSubmissionFile(submission) {
  return submission.files?.[0] ?? submission.file ?? null
}

export function mapStudentSubmission(submission = {}) {
  const file = getSubmissionFile(submission)
  const teacherResult = submission.teacher_result

  return {
    id: submission.id,
    attemptNumber: submission.attempt_number ?? 1,
    fileName: file?.original_filename ?? 'Bài nộp',
    fileSizeBytes: file?.size_bytes ?? 0,
    submittedAt: submission.submitted_at ?? submission.created_at ?? null,
    status: STATUS_MAP[submission.status] ?? 'submitted',
    result: teacherResult
      ? {
          finalStatus: normalizeFinalStatus(teacherResult.final_status),
          feedback: teacherResult.feedback ?? '',
        }
      : null,
  }
}

export function mapStudentSubmissions(submissions = []) {
  return Array.isArray(submissions) ? submissions.map(mapStudentSubmission) : []
}
