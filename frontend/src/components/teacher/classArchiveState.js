export const CLASS_PAGE_SIZE = 20

/**
 * Chuẩn hoá chuỗi để tìm kiếm tiếng Việt không phân biệt dấu và hoa/thường.
 * NFD không tự tách ký tự đ/Đ nên xử lý hai ký tự này riêng.
 */
export function normalizeTeacherSearch(value) {
  return String(value ?? '')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function classSearchText(classroom = {}) {
  return [
    classroom.code,
    classroom.subject,
    classroom.semester,
    classroom.schoolYear,
  ]
    .map(normalizeTeacherSearch)
    .filter(Boolean)
    .join(' ')
}

export function filterTeacherClasses(classes = [], query = '') {
  const normalizedQuery = normalizeTeacherSearch(query)

  if (!normalizedQuery) {
    return [...classes]
  }

  const matches = []

  for (const classroom of classes) {
    if (classSearchText(classroom).indexOf(normalizedQuery) !== -1) {
      matches.push(classroom)
    }
  }

  return matches
}

export function clampClassPage(page, pageCount) {
  const safePage = Number.isFinite(Number(page)) ? Math.trunc(Number(page)) : 1
  const safePageCount = Math.max(1, pageCount)
  return Math.min(Math.max(1, safePage), safePageCount)
}

export function buildClassArchiveModel({
  classes = [],
  query = '',
  page = 1,
  selectedClassId = null,
  pageSize = CLASS_PAGE_SIZE,
} = {}) {
  const loadedClasses = Array.isArray(classes) ? classes : []
  const matches = filterTeacherClasses(loadedClasses, query)
  const safePageSize = Math.max(1, Number(pageSize) || CLASS_PAGE_SIZE)
  const pageCount = Math.max(1, Math.ceil(matches.length / safePageSize))
  const safePage = clampClassPage(page, pageCount)
  const start = (safePage - 1) * safePageSize
  const items = matches.slice(start, start + safePageSize)
  const classesById = new Map(loadedClasses.map((classroom) => [classroom.id, classroom]))
  const selectedClass = classesById.get(selectedClassId) ?? loadedClasses[0] ?? null

  return {
    items,
    matches,
    selectedClass,
    page: safePage,
    pageCount,
    start,
    end: start + items.length,
    totalLoaded: loadedClasses.length,
    query: String(query ?? ''),
    hasSearchMatches: matches.length > 0,
    selectedOutsideResults: Boolean(
      selectedClass && query && !matches.some((classroom) => classroom.id === selectedClass.id),
    ),
  }
}
