import { mapStudentSubmission, mapStudentSubmissions } from '../services/studentSubmissionAdapter.js'

/** One mounted assignment session. No persistence, polling, or automatic retry. */
export function createStudentSubmissionSession(assignmentId, service) {
  let active = true, generation = 0, pending = false
  let snapshot = { history: { status: 'loading', data: [] }, submit: { status: 'idle' } }
  const confirmed = new Map()
  const listeners = new Set()
  const belongsHere = row => row && typeof row.id === 'string' && row.id && (!row.assignment_id || row.assignment_id === assignmentId)
  const publish = (next) => { snapshot = next; listeners.forEach(listener => listener()) }
  const merge = (rows) => {
    const ids = new Set(rows.map(row => row.id))
    return [...rows, ...[...confirmed.values()].filter(row => !ids.has(row.id))]
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    deactivate() { active = false; generation++ },
    resetSubmit() { if (active && !pending) publish({ ...snapshot, submit: { status: 'idle' } }) },
    async loadHistory() {
      active = true
      const token = ++generation
      try {
        const rows = await service.listMySubmissions(assignmentId)
        if (!Array.isArray(rows) || rows.some(row => !belongsHere(row))) throw new Error('Không thể xác minh lịch sử của bài kiểm tra này.')
        if (active && token === generation) publish({ ...snapshot, history: { status: 'success', data: merge(mapStudentSubmissions(rows)) } })
      } catch (error) {
        if (active && token === generation) publish({ ...snapshot, history: { status: 'error', data: merge(snapshot.history.data), message: error.message ?? 'Không thể tải lịch sử nộp bài.' } })
      }
    },
    async submit({ file, fileName }) {
      if (!active || pending) return false
      pending = true
      const token = generation
      publish({ ...snapshot, submit: { status: 'loading' } })
      try {
        const result = await service.createSubmission(assignmentId, file, fileName)
        if (!active || token !== generation) return false
        if (!belongsHere(result)) throw new Error('Không thể xác minh bài nộp vừa gửi. Vui lòng kiểm tra lại trước khi thử lại.')
        const saved = mapStudentSubmission(result)
        confirmed.set(saved.id, saved)
        publish({ history: { ...snapshot.history, data: merge(snapshot.history.data) }, submit: { status: 'success', data: { ...saved, fileName } } })
        return true
      } catch (error) {
        if (active && token === generation) publish({ ...snapshot, submit: { status: 'error', message: error.message ?? 'Không thể nộp bài lúc này. Vui lòng thử lại.' } })
        return false
      } finally { pending = false }
    },
  }
}
