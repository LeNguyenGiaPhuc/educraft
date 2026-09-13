import {
  createStoredSubmission,
  updateStoredSubmissionReview,
} from './mockSubmissionStore.js'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png']
export const FINAL_REVIEW_STATUSES = Object.freeze([
  'completed',
  'needs_completion',
  'requires_teacher_review',
])

const FINAL_REVIEW_STATUS_LABELS = Object.freeze({
  completed: 'Completed',
  needs_completion: 'Needs Completion',
  requires_teacher_review: 'Requires Teacher Review',
})

export function getFinalReviewStatusLabel(status) {
  return FINAL_REVIEW_STATUS_LABELS[status] ?? FINAL_REVIEW_STATUS_LABELS.requires_teacher_review
}

export function validateSubmissionForm(form = {}) {
  const errors = {}
  const fileName = String(form.fileName ?? '').trim().toLowerCase()
  const fileSizeBytes = Number(form.fileSizeBytes)

  if (!fileName) {
    errors.file = 'Chọn ảnh bài ghi để nộp.'
  } else if (!ACCEPTED_FILE_EXTENSIONS.some((extension) => fileName.endsWith(extension))) {
    errors.file = 'Chỉ nhận file JPG, JPEG hoặc PNG.'
  } else if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    errors.file = 'File bài ghi không hợp lệ.'
  } else if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    errors.file = 'Kích thước file không được vượt quá 5 MB.'
  }

  return errors
}

export function submitNote(form, outcome = 'success', delay = 0, storage) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (outcome === 'error') {
        resolve({
          status: 'error',
          message: 'Không thể nộp bài lúc này. Vui lòng thử lại.',
        })
        return
      }

      try {
        const submission = createStoredSubmission(form, storage)

        resolve({
          status: 'success',
          data: submission,
        })
      } catch (error) {
        reject(error)
      }
    }, delay)
  })
}

export function getMockAiEvaluation() {
  return {
    suggestedStatus: 'needs_completion',
    confidence: 0.91,
    strengths: ['Đủ các ý chính', 'Bố cục rõ ràng'],
    weaknesses: ['Phần kết luận còn ngắn'],
    feedbackDraft: 'Bài ghi đầy đủ, cần bổ sung phần kết luận.',
  }
}

export function validateReviewForm(form = {}) {
  const errors = {}
  const finalStatus = String(form.finalStatus ?? '').trim()
  const feedback = String(form.feedback ?? '').trim()

  if (!finalStatus) {
    errors.finalStatus = 'Chọn kết quả cuối cùng.'
  } else if (!FINAL_REVIEW_STATUSES.includes(finalStatus)) {
    errors.finalStatus = 'Kết quả cuối cùng không hợp lệ.'
  }

  if (!feedback) {
    errors.feedback = 'Nhập nhận xét cho học sinh.'
  }

  return errors
}

export function reviewSubmission(form, outcome = 'success', delay = 0, storage) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (outcome === 'error') {
        resolve({
          status: 'error',
          message: 'Không thể lưu kết quả chấm lúc này. Vui lòng thử lại.',
        })
        return
      }

      try {
        const submission = updateStoredSubmissionReview(form.submissionId, form, storage)

        resolve({
          status: 'success',
          data: submission,
        })
      } catch (error) {
        reject(error)
      }
    }, delay)
  })
}
