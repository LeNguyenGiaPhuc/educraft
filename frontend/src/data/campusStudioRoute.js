export function getCampusStudioSurface(pathname = '') {
  const normalized = String(pathname).replace(/\/+$/, '') || '/'
  if (normalized === '/student') return 'student-dashboard'
  if (/^\/student\/assignments\/[^/]+$/.test(normalized)) return 'student-workspace'
  if (normalized === '/teacher') return 'teacher-dashboard'

  const reviewMatch = normalized.match(/^\/classes\/[^/]+\/assignments\/([^/]+)$/)
  if (reviewMatch && reviewMatch[1] !== 'new') return 'teacher-review'

  if (
    normalized === '/assignments/new'
    || /^\/classes\/[^/]+$/.test(normalized)
    || /^\/classes\/[^/]+\/assignments\/new$/.test(normalized)
  ) return 'teacher-workspace'

  return null
}
