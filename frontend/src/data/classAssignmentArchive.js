import { formatAssignmentDeadline } from './assignmentDeadline.js'
import { normalizeTeacherSearch } from '../components/teacher/classArchiveState.js'

export const ASSIGNMENT_PAGE_SIZE = 25
export const ASSIGNMENT_STATUSES = {
  OPEN: 'Đang mở', CLOSED: 'Đã đóng', DRAFT: 'Bản nháp',
}

export function mapClassAssignment(assignment = {}, submissionCount) {
  return {
    id: assignment.id,
    title: assignment.title ?? 'Chưa có tên',
    dueAt: assignment.due_at,
    dueDate: formatAssignmentDeadline({ dueAt: assignment.due_at }),
    threshold: `${Number(assignment.coverage_threshold ?? 0)}%`,
    statusCode: assignment.status ?? null,
    status: ASSIGNMENT_STATUSES[assignment.status] ?? 'Chưa rõ trạng thái',
    submissionCount: Number.isFinite(submissionCount) ? submissionCount : null,
    submission: Number.isFinite(submissionCount) ? `${submissionCount} lượt nộp` : 'Chưa có dữ liệu',
  }
}

export function buildAssignmentArchive({ rows = [], query = '', status = '', page = 1 } = {}) {
  const needle = normalizeTeacherSearch(query)
  const matches = rows.filter(row => (!needle || normalizeTeacherSearch(row.title).includes(needle))
    && (!status || row.statusCode === status))
  const pageCount = Math.max(1, Math.ceil(matches.length / ASSIGNMENT_PAGE_SIZE))
  const safePage = Math.min(Math.max(1, Math.trunc(Number(page)) || 1), pageCount)
  const start = (safePage - 1) * ASSIGNMENT_PAGE_SIZE
  const items = matches.slice(start, start + ASSIGNMENT_PAGE_SIZE)
  return { items, start, end: start + items.length, page: safePage, pageCount, matchCount: matches.length, loadedCount: rows.length }
}
