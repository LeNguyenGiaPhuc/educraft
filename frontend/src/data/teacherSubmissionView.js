export function mapTeacherSubmission(submission = {}) {
  const file = submission.files?.[0]
  const review = submission.teacher_review
  const student = submission.student
  const isFinalized = submission.status === 'FINALIZED' || review?.is_finalized === true

  return {
    id: submission.id,
    studentId: submission.student_id ?? '',
    studentName: student?.full_name
      ?? student?.student_code
      ?? submission.student_id
      ?? 'Học sinh',
    studentCode: student?.student_code ?? '',
    attemptNumber: submission.attempt_number,
    fileName: file?.original_filename ?? 'Chưa có file',
    fileUrl: file?.signed_url ?? '',
    submittedAt: submission.submitted_at,
    status: isFinalized ? 'approved' : 'submitted',
    finalStatus: review?.final_status ?? '',
    feedback: review?.feedback ?? '',
    teacherReview: review,
  }
}

export function formatSubmissionAttempt(attemptNumber) {
  return Number.isInteger(attemptNumber) && attemptNumber > 0
    ? `Lần ${attemptNumber}`
    : 'Chưa xác định lần nộp'
}

export function selectTeacherSubmission(submissions, selectedId) {
  return submissions.find((submission) => submission.id === selectedId)
    ?? submissions[0]
    ?? null
}
