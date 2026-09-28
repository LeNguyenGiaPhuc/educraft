import assert from 'node:assert/strict'
import test from 'node:test'

import { createOllamaEmbeddingProvider } from '../src/modules/ai-evaluations/providers/ollamaEmbeddingProvider.js'

function response(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return body
    },
    async text() {
      return JSON.stringify(body)
    },
  }
}

test('sends the configured model and all texts to Ollama embeddings', async () => {
  const calls = []
  const provider = createOllamaEmbeddingProvider({
    baseUrl: 'http://localhost:11434/',
    model: 'nomic-embed-text-v2-moe:latest',
    dimensions: 3,
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return response({ embeddings: [[1, 2, 3], [4, 5, 6]] })
    },
  })

  const result = await provider.embedTexts(['đoạn một', 'đoạn hai'])
  const body = JSON.parse(calls[0].options.body)

  assert.deepEqual(result, [[1, 2, 3], [4, 5, 6]])
  assert.equal(calls[0].url, 'http://localhost:11434/api/embed')
  assert.equal(body.model, 'nomic-embed-text-v2-moe:latest')
  assert.deepEqual(body.input, ['đoạn một', 'đoạn hai'])
  assert.equal(calls[0].options.method, 'POST')
})

test('returns no requests for an empty text list', async () => {
  let calls = 0
  const provider = createOllamaEmbeddingProvider({
    fetchImpl: async () => {
      calls += 1
      return response({ embeddings: [] })
    },
  })

  assert.deepEqual(await provider.embedTexts([]), [])
  assert.equal(calls, 0)
})

test('rejects embeddings with the wrong configured dimension', async () => {
  const provider = createOllamaEmbeddingProvider({
    dimensions: 3,
    fetchImpl: async () => response({ embeddings: [[1, 2]] }),
  })

  await assert.rejects(
    provider.embedTexts(['đoạn văn']),
    (error) => error.code === 'AI_EMBEDDING_INVALID_RESPONSE',
  )
})

test('maps Ollama HTTP failures to a safe embedding error', async () => {
  const provider = createOllamaEmbeddingProvider({
    fetchImpl: async () => response({ error: 'secret provider detail' }, { ok: false, status: 500 }),
  })

  await assert.rejects(
    provider.embedTexts(['đoạn văn']),
    (error) => error.code === 'AI_EMBEDDING_FAILED'
      && !error.message.includes('secret provider detail'),
  )
})

test('maps an aborted request to a timeout error and clears its timer', async () => {
  const provider = createOllamaEmbeddingProvider({
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted')
        error.name = 'AbortError'
        reject(error)
      })
    }),
  })

  await assert.rejects(
    provider.embedTexts(['đoạn văn']),
    (error) => error.code === 'AI_EMBEDDING_TIMEOUT',
  )
})

