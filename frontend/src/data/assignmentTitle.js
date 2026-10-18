export const MAX_ASSIGNMENT_TITLE_LENGTH = 160

export function validateAssignmentTitle(value) {
  const title = String(value ?? '').trim()

  if (!title) {
    return 'Nhập tên bài kiểm tra.'
  }

  if (title.length > MAX_ASSIGNMENT_TITLE_LENGTH) {
    return `Tên bài kiểm tra không vượt quá ${MAX_ASSIGNMENT_TITLE_LENGTH} ký tự.`
  }

  return null
}
