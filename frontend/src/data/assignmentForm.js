import { toCanonicalDeadline } from './assignmentDeadline.js'
import { validateAssignmentTitle } from './assignmentTitle.js'

export function validateAssignmentForm(form = {}, classrooms) {
  const errors = {}
  const classId = String(form.classId ?? '').trim()
  const dueAt = String(form.dueAt ?? '').trim()
  const threshold = String(form.threshold ?? '').trim()

  const titleError = validateAssignmentTitle(form.title)
  if (titleError) errors.title = titleError

  if (!classrooms.some((classroom) => classroom.id === classId)) {
    errors.classId = 'Chọn lớp học.'
  }

  if (!dueAt) {
    errors.dueAt = 'Chọn hạn nộp.'
  } else if (!toCanonicalDeadline(dueAt)) {
    errors.dueAt = 'Hạn nộp không hợp lệ.'
  }

  if (!threshold) {
    errors.threshold = 'Nhập ngưỡng đạt.'
  } else if (!Number.isFinite(Number(threshold)) || Number(threshold) < 0 || Number(threshold) > 100) {
    errors.threshold = 'Ngưỡng đạt phải từ 0 đến 100%.'
  }

  return errors
}
