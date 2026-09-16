import {
  createStoredSubmission,
  updateStoredSubmissionReview,
} from './mockSubmissionStore.js'
export {
  FINAL_REVIEW_STATUSES,
  getFinalReviewStatusLabel,
  validateReviewForm,
  validateSubmissionForm,
} from './submissionValidation.js'

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
