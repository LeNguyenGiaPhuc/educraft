// The school uses UTC+07:00, including the teacher's datetime-local input.
const studentDeadlineFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
})
const teacherDeadlineInputFormatter = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
})

function parseCanonicalDeadline(value) {
  if (typeof value !== 'string') return NaN

  const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!parts || Number(parts[2]) > 23) return NaN

  const date = new Date(`${parts[1]}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== parts[1]) {
    return NaN
  }

  return Date.parse(value)
}

export function toCanonicalDeadline(value) {
  const input = String(value ?? '').trim()
  const canonical = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)
    ? `${input}:00+07:00`
    : input

  return Number.isFinite(parseCanonicalDeadline(canonical)) ? canonical : null
}

export function toTeacherDeadlineInput(value) {
  const deadline = parseCanonicalDeadline(value)
  if (!Number.isFinite(deadline)) return ''

  const parts = Object.fromEntries(
    teacherDeadlineInputFormatter
      .formatToParts(deadline)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value: partValue }) => [type, partValue]),
  )

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function toAssignmentUpdateDeadline(input, originalDeadline) {
  const canonical = toCanonicalDeadline(input)
  if (!canonical) return null

  return input === toTeacherDeadlineInput(originalDeadline)
    ? toCanonicalDeadline(originalDeadline)
    : canonical
}

export function getAssignmentAvailability(assignment, now = Date.now()) {
  const deadline = parseCanonicalDeadline(assignment.dueAt)

  if (!Number.isFinite(deadline) || !Number.isFinite(now)) {
    return { isOpen: false, message: 'Chưa xác định được hạn nộp. Vui lòng liên hệ giáo viên.' }
  }
  if (now >= deadline) {
    return { isOpen: false, message: 'Đã hết hạn nộp bài. Bạn không thể nộp bài mới.' }
  }
  if (assignment.statusTone === 'closed') {
    return { isOpen: false, message: 'Bài kiểm tra đã đóng. Bạn không thể nộp bài mới.' }
  }

  return { isOpen: true, message: '' }
}

export function formatAssignmentDeadline(assignment) {
  const deadline = parseCanonicalDeadline(assignment.dueAt)
  if (!Number.isFinite(deadline)) return 'Chưa xác định'

  return `${studentDeadlineFormatter.format(deadline)} (UTC+07:00)`
}
