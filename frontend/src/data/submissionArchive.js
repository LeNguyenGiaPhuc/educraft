import { normalizeTeacherSearch } from '../components/teacher/classArchiveState.js'
export const SUBMISSION_PAGE_SIZE = 30

export function buildSubmissionArchive({ submissions = [], query = '', page = 1, selectedId } = {}) {
  const needle = normalizeTeacherSearch(query)
  const matches = submissions.filter(row => {
    const text = [row.studentName, row.studentCode, row.attemptNumber, row.fileName].join(' ')
    return !needle || normalizeTeacherSearch(text).includes(needle)
  })
  const pageCount = Math.max(1, Math.ceil(matches.length / SUBMISSION_PAGE_SIZE))
  const current = Math.min(pageCount, Math.max(1, Math.trunc(Number(page)) || 1))
  const start = (current - 1) * SUBMISSION_PAGE_SIZE
  const items = matches.slice(start, start + SUBMISSION_PAGE_SIZE)
  const selectedIndex = submissions.findIndex(row => row.id === selectedId)

  // Selection remains independent of search/page; the anchor returns to its
  // original API-order page without dropping attempts or triggering AI.
  return {
    items, page: current, pageCount, start, end: start + items.length,
    matchCount: matches.length,
    selectionVisible: items.some(row => row.id === selectedId),
    selectedPage: Math.max(1, Math.floor(selectedIndex / SUBMISSION_PAGE_SIZE) + 1),
  }
}
