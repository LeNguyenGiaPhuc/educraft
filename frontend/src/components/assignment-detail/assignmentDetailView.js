const submissionDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function formatSubmissionDate(value) {
  if (!value) return 'Chưa có thời gian'

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Chưa có thời gian'

  return submissionDateFormatter.format(date)
}

export function mapEvaluation(result = {}) {
  const evaluation = result.evaluation ?? result
  const missingContent = Array.isArray(evaluation.missing_content)
    ? evaluation.missing_content
    : []
  const uncertainContent = Array.isArray(evaluation.uncertain_content)
    ? evaluation.uncertain_content
    : []

  return {
    suggestedStatus: evaluation.suggested_status ?? 'REQUIRES_TEACHER_REVIEW',
    confidence: Number(evaluation.confidence ?? 0),
    coverageScore: Number(evaluation.coverage_score ?? 0),
    strengths: Number.isFinite(Number(evaluation.coverage_score))
      ? [`Độ bao phủ nội dung: ${evaluation.coverage_score}%`]
      : ['Chưa có dữ liệu điểm bao phủ.'],
    weaknesses: missingContent.length > 0
      ? missingContent
      : ['Không có nội dung thiếu được ghi nhận.'],
    feedbackDraft: evaluation.feedback_draft ?? '',
    provider: evaluation.provider ?? '',
    modelName: evaluation.model_name ?? '',
    promptVersion: evaluation.prompt_version ?? '',
    referenceTranscription: evaluation.reference_transcription ?? '',
    studentTranscription: evaluation.student_transcription ?? '',
    uncertainContent,
  }
}

export function finalStatusLabel(status) {
  const labels = {
    COMPLETED: 'Completed',
    NEEDS_COMPLETION: 'Needs Completion',
    REQUIRES_TEACHER_REVIEW: 'Requires Teacher Review',
  }
  return labels[status] ?? 'Chưa chốt'
}

export function finalStatusForForm(status, suggestedStatus) {
  if (status === 'COMPLETED' || status === 'NEEDS_COMPLETION') return status
  return suggestedStatus === 'COMPLETED' ? 'COMPLETED' : 'NEEDS_COMPLETION'
}
