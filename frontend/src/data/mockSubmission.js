import { createStoredSubmission } from './mockSubmissionStore.js'

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
