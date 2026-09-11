import {
  createStoredSubmission,
  updateStoredSubmissionReview,
} from './mockSubmissionStore.js'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png']

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
    suggestedScore: 86,
    confidence: 0.91,
    strengths: ['Đủ các ý chính', 'Bố cục rõ ràng'],
    weaknesses: ['Phần kết luận còn ngắn'],
    feedbackDraft: 'Bài ghi đầy đủ, cần bổ sung phần kết luận.',
  }
}

export function validateReviewForm(form = {}) {
  const errors = {}
  const score = String(form.score ?? '').trim()
  const feedback = String(form.feedback ?? '').trim()

  if (!score) {
    errors.score = 'Nhập điểm chốt của giáo viên.'
  } else if (!Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 100) {
    errors.score = 'Điểm chốt phải từ 0 đến 100.'
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
