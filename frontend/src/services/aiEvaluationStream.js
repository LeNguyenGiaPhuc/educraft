import { ApiError } from './apiClient.js'

export const AI_STAGE_LABELS = Object.freeze({
  input_ready: 'Đã chuẩn bị đầu vào.', transcribed: 'Đã chép nội dung ảnh.',
  evaluated: 'Đã phân tích bài nộp.', checked: 'Đã kiểm tra chéo.', persisted: 'Đã lưu đề xuất.',
})

function interrupted(cause) {
  return new ApiError({ code: 'AI_STREAM_INTERRUPTED',
    message: 'Kết nối tiến độ bị gián đoạn. AI có thể vẫn đang chạy trên máy chủ.', cause })
}

export async function readEvaluationStream(response, { submissionId, signal, onProgress } = {}) {
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw interrupted()
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const cancel = () => { void reader.cancel().catch(() => {}) }
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const { value, done } = await reader.read()
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      if (buffer.length > 1024 * 1024) throw interrupted()
      let boundary
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const block = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary[0].length)
        let event = 'message'
        const data = []
        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
        }
        if (!data.length || !['stage', 'complete', 'error'].includes(event)) continue
        let payload
        try { payload = JSON.parse(data.join('\n')) } catch { throw interrupted() }
        if (event === 'error') throw new ApiError({ code: payload?.code ?? 'AI_ERROR',
          message: payload?.message ?? 'Không thể hoàn tất đánh giá AI.' })
        if (event === 'stage') {
          if (payload?.submissionId === submissionId && Object.hasOwn(AI_STAGE_LABELS, payload.stage)) {
            onProgress?.({ stage: payload.stage, submissionId })
          }
        } else {
          if (payload?.submission_id !== submissionId || payload?.submission_status !== 'REQUIRES_REVIEW'
            || !payload.evaluation) throw interrupted()
          return payload
        }
      }
      if (done) throw interrupted()
    }
  } catch (error) {
    if (error?.name === 'AbortError' || error instanceof ApiError) throw error
    throw interrupted(error)
  } finally {
    signal?.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
