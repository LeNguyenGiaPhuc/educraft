/** Local browsing only; IDs and the API's order remain authoritative. */
export function normalizeStudentSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim()
}

export function studentPage(rows = [], page = 1, size = 20) {
  const pageCount = Math.max(1, Math.ceil(rows.length / size))
  const current = Math.min(pageCount, Math.max(1, Math.trunc(Number(page)) || 1))
  const start = (current - 1) * size
  const items = rows.slice(start, start + size)
  return { items, page: current, pageCount, start, end: start + items.length, matchCount: rows.length }
}

export function buildStudentArchive({ classes = [], classQuery = '', classPage = 1, selectedId, assignmentQuery = '', assignmentPage = 1 } = {}) {
  const selected = classes.find(row => row.id === selectedId) ?? classes[0] ?? null
  const needle = normalizeStudentSearch(classQuery)
  const matches = classes.filter(row => !needle || normalizeStudentSearch([row.code, row.subject].join(' ')).includes(needle))
  const title = normalizeStudentSearch(assignmentQuery)
  const assignments = (selected?.assignments ?? []).filter(row => !title || normalizeStudentSearch(row.title).includes(title))
  return { selected, classes: studentPage(matches, classPage, 20), assignments: studentPage(assignments, assignmentPage, 25) }
}
