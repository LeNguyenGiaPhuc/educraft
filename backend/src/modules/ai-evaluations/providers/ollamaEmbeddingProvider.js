import { AppError } from '../../../common/errors.js'

function embeddingUnavailable() {
  return new AppError(
    503,
    'AI_EMBEDDING_UNAVAILABLE',
    'Dịch vụ embedding chưa được cấu hình.',
  )
}

function embeddingFailed() {
  return new AppError(
    502,
    'AI_EMBEDDING_FAILED',
    'Không thể tạo embedding cho nội dung bài mẫu.',
  )
}

function invalidEmbeddingResponse() {
  return new AppError(
    502,
    'AI_EMBEDDING_INVALID_RESPONSE',
    'Dịch vụ embedding trả về dữ liệu không hợp lệ.',
  )
}

function embeddingTimeout() {
  return new AppError(
    504,
    'AI_EMBEDDING_TIMEOUT',
    'Dịch vụ embedding phản hồi quá lâu.',
  )
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl ?? '').trim().replace(/\/+$/, '')
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'ABORT_ERR'
}

function validTextList(texts) {
  return Array.isArray(texts)
    && texts.length > 0
    && texts.every((text) => typeof text === 'string' && text.trim())
}

function validateEmbeddings(body, expectedCount, dimensions) {
  if (!Array.isArray(body?.embeddings) || body.embeddings.length !== expectedCount) {
    throw invalidEmbeddingResponse()
  }

  const embeddings = body.embeddings.map((embedding) => {
    if (
      !Array.isArray(embedding)
      || embedding.length !== dimensions
      || embedding.some((value) => typeof value !== 'number' || !Number.isFinite(value))
    ) {
      throw invalidEmbeddingResponse()
    }
    return embedding
  })

  return embeddings
}

export function createOllamaEmbeddingProvider({
  baseUrl = 'http://127.0.0.1:11434',
  model = 'nomic-embed-text-v2-moe:latest',
  dimensions = 768,
  timeoutMs = 60000,
  fetchImpl = globalThis.fetch,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  if (!normalizedBaseUrl || typeof fetchImpl !== 'function') {
    throw embeddingUnavailable()
  }

  return {
    async embedTexts(texts) {
      if (!Array.isArray(texts)) throw invalidEmbeddingResponse()
      if (texts.length === 0) return []
      if (!validTextList(texts)) throw invalidEmbeddingResponse()

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetchImpl(`${normalizedBaseUrl}/api/embed`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            input: texts,
          }),
        })

        if (!response?.ok) throw embeddingFailed()

        let body
        try {
          body = await response.json()
        } catch {
          throw invalidEmbeddingResponse()
        }

        return validateEmbeddings(body, texts.length, dimensions)
      } catch (error) {
        if (error instanceof AppError) throw error
        if (isAbortError(error)) throw embeddingTimeout()
        throw embeddingFailed()
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

