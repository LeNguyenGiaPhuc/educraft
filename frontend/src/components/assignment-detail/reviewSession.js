const pendingSubmissions = new Set()

// Each mounted submission owns one session. Disposed sessions never publish late results.
export function createReviewSession({ service, submissionId, onChange }) {
  let disposed = false
  let busy = false
  let controller
  const publish = (state) => { if (!disposed) onChange(state) }
  async function sync({ uncertain = false } = {}) {
    try {
      const data = await service.getEvaluation(submissionId)
      pendingSubmissions.delete(submissionId)
      publish({ status: 'success', data })
    } catch (error) {
      const missing = error?.status === 404 || error?.code === 'AI_EVALUATION_NOT_FOUND'
      publish(uncertain
        ? { status: 'interrupted', data: null, message: missing
          ? 'Chưa có kết quả đã lưu. AI có thể vẫn đang chạy; tải lại đề xuất để đồng bộ.'
          : error?.message ?? 'Chưa thể đồng bộ kết quả. Hãy tải lại đề xuất khi kết nối được khôi phục.' }
        : { status: missing ? 'not-started' : 'error', data: null, message: error?.message })
    }
  }
  return {
    async load(options) {
      if (disposed || busy) return
      busy = true
      publish({ status: 'loading', data: null })
      try { await sync({ uncertain: pendingSubmissions.has(submissionId), ...options }) } finally { busy = false }
    },
    async run() {
      if (disposed || busy) return
      busy = true
      pendingSubmissions.add(submissionId)
      controller = new AbortController()
      publish({ status: 'running', data: null })
      try {
        const data = await service.streamEvaluation(submissionId, {
          signal: controller.signal,
          onProgress: ({ stage }) => publish({ status: 'running', stage, data: null }),
        })
        pendingSubmissions.delete(submissionId)
        publish({ status: 'success', data })
      } catch (error) {
        if (disposed) return
        if (['AI_STREAM_INTERRUPTED', 'AI_EVALUATION_RUNNING'].includes(error?.code)
          || error?.name === 'AbortError') {
          await sync({ uncertain: true })
        } else {
          pendingSubmissions.delete(submissionId)
          publish({ status: 'error', data: null, message: error?.message ?? 'Không thể phân tích bài nộp.' })
        }
      } finally { busy = false }
    },
    dispose() { disposed = true; controller?.abort() },
  }
}
