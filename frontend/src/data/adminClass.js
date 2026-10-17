import { searchRegistry } from './adminRegistry.js'

const classCollator = new Intl.Collator('vi', {
  numeric: true,
  sensitivity: 'base',
})

const classComparators = {
  'code-asc': (left, right) => classCollator.compare(left.code ?? '', right.code ?? ''),
  'code-desc': (left, right) => classCollator.compare(right.code ?? '', left.code ?? ''),
  'subject-asc': (left, right) => classCollator.compare(left.subject ?? '', right.subject ?? ''),
}

export function buildClassPayload(form) {
  return {
    code: form.id.trim().toUpperCase(),
    subject: form.name.trim(),
    semester: form.semester.trim(),
    school_year: form.schoolYear.trim(),
    teacher_id: form.teacherId || null,
    status: String(form.status).toUpperCase() === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
  }
}

export function getClassStatusLabel(status) {
  const normalized = String(status ?? '').toUpperCase()
  if (normalized === 'ACTIVE') return 'Đang hoạt động'
  if (normalized === 'ARCHIVED') return 'Đã lưu trữ'
  return 'Không xác định'
}

export function getClassStatusAction(status) {
  return String(status ?? '').toUpperCase() === 'ARCHIVED'
    ? { nextStatus: 'ACTIVE', label: 'Khôi phục lớp' }
    : { nextStatus: 'ARCHIVED', label: 'Lưu trữ lớp' }
}

export function getDeleteClassConfirmation(classroom) {
  return (
    `Bạn có chắc chắn muốn xóa lớp ${classroom.code ?? classroom.id} không?\n\n`
    + 'Sẽ gỡ các thành viên khỏi lớp và xóa dữ liệu liên quan. Số bài kiểm tra liên quan chưa được xác minh. '
    + 'Tài khoản học sinh vẫn được giữ lại.'
  )
}

export function filterAdminClasses(rows, query, teacher = 'all', status = 'all') {
  return searchRegistry(rows, query, ['code', 'subject']).filter((row) => (
    (teacher === 'all' || row.teacher_id === teacher)
    && (status === 'all' || row.status === status)
  ))
}

export function sortAdminClasses(classes, sort = 'default') {
  const compare = classComparators[sort]
  if (!compare) return [...classes]

  return classes
    .map((classroom, index) => ({ classroom, index }))
    .sort((left, right) => compare(left.classroom, right.classroom) || left.index - right.index)
    .map(({ classroom }) => classroom)
}
