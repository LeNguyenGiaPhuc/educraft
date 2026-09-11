import { createStoredReference } from './mockReferenceStore.js'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png']

export function validateReferenceForm(form = {}) {
  const errors = {}
  const fileName = String(form.fileName ?? '').trim().toLowerCase()
  const fileSizeBytes = Number(form.fileSizeBytes)

  if (!fileName) {
    errors.file = 'Chọn bài mẫu của giáo viên để tải lên.'
  } else if (!ACCEPTED_FILE_EXTENSIONS.some((extension) => fileName.endsWith(extension))) {
    errors.file = 'Chỉ nhận file JPG, JPEG hoặc PNG cho bài mẫu.'
  } else if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    errors.file = 'File bài mẫu không hợp lệ.'
  } else if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    errors.file = 'Kích thước bài mẫu không được vượt quá 5 MB.'
  }

  return errors
}

export function submitReference(form, outcome = 'success', delay = 0, storage) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (outcome === 'error') {
        resolve({
          status: 'error',
          message: 'Không thể lưu bài mẫu lúc này. Vui lòng thử lại.',
        })
        return
      }

      try {
        const reference = createStoredReference(form, storage)

        resolve({
          status: 'success',
          data: reference,
        })
      } catch (error) {
        reject(error)
      }
    }, delay)
  })
}
