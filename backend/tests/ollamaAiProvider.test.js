import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'

import { AppError } from '../src/common/errors.js'
import {
  evaluationSuggestionJsonSchema,
  singleImageTranscriptionJsonSchema,
} from '../src/modules/ai-evaluations/aiEvaluationSchema.js'
import { createOllamaAiProvider } from '../src/modules/ai-evaluations/providers/ollamaAiProvider.js'

const referenceImage = await sharp({
  create: { width: 4, height: 4, channels: 3, background: 'white' },
}).png().toBuffer()
const submissionImage = await sharp({
  create: { width: 4, height: 4, channels: 3, background: 'black' },
}).png().toBuffer()

const input = {
  assignmentTitle: 'Lực ma sát',
  coverageThreshold: 80,
  referenceImages: [{ mimeType: 'image/png', buffer: referenceImage, order: 1 }],
  submissionImages: [{ mimeType: 'image/png', buffer: submissionImage, order: 1 }],
}

const multiImageInput = {
  ...input,
  referenceImages: [
    ...input.referenceImages,
    { mimeType: 'image/png', buffer: referenceImage, order: 2 },
  ],
}

const referencePage = JSON.stringify({
  transcription: 'Lực ma sát là lực cản trở chuyển động.',
  uncertain_content: [],
})

const submissionPage = JSON.stringify({
  transcription: 'Lực ma sát cản trở chuyển động.',
  uncertain_content: [],
})

const suggestion = JSON.stringify({
  coverage_score: 82,
  confidence: 0.84,
  suggested_status: 'REQUIRES_TEACHER_REVIEW',
  missing_content: ['Bổ sung phần kết luận.'],
  feedback_draft: 'Bài làm đủ ý chính nhưng cần bổ sung phần kết luận.',
})

function createFakeFetch(responses, calls = []) {
  return async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      async json() {
        return { message: { content: responses.shift() } }
      },
    }
  }
}

test('Ollama provider sends both image sets and returns validated metadata', async () => {
  const calls = []
  const provider = createOllamaAiProvider({
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen3-vl:2b',
    fetchImpl: createFakeFetch([referencePage, submissionPage, suggestion], calls),
    now: (() => {
      const timestamps = [1000, 1125]
      return () => timestamps.shift()
    })(),
  })

  const result = await provider.evaluate(input)

  assert.equal(result.provider, 'ollama')
  assert.equal(result.model_name, 'qwen3-vl:2b')
  assert.equal(result.latency_ms, 125)
  assert.equal(calls.length, 3)

  const firstBody = JSON.parse(calls[0].options.body)
  assert.equal(calls[0].url, 'http://127.0.0.1:11434/api/chat')
  assert.equal(firstBody.model, 'qwen3-vl:2b')
  assert.equal(firstBody.stream, false)
  assert.equal(firstBody.think, false)
  assert.deepEqual(firstBody.options, {
    temperature: 0.1,
    num_ctx: 4096,
    num_predict: 512,
  })
  assert.deepEqual(firstBody.format, singleImageTranscriptionJsonSchema)
  assert.equal(firstBody.messages[0].images[0], referenceImage.toString('base64'))

  const secondBody = JSON.parse(calls[1].options.body)
  assert.deepEqual(secondBody.format, singleImageTranscriptionJsonSchema)
  assert.equal(secondBody.messages[0].images[0], submissionImage.toString('base64'))

  const evaluationBody = JSON.parse(calls[2].options.body)
  assert.deepEqual(evaluationBody.format, evaluationSuggestionJsonSchema)
  assert.match(evaluationBody.messages[0].content, /Lực ma sát/)
  assert.doesNotMatch(evaluationBody.messages[0].content, /student@example|studentId|email/i)
})

test('Ollama provider downsizes large images before sending them to the local model', async () => {
  const largeImage = await sharp({
    create: {
      width: 1536,
      height: 2048,
      channels: 3,
      background: 'white',
    },
  }).jpeg().toBuffer()
  const calls = []
  const provider = createOllamaAiProvider({
    model: 'qwen3-vl:2b',
    fetchImpl: createFakeFetch([referencePage, submissionPage, suggestion], calls),
  })

  await provider.evaluate({
    ...input,
    referenceImages: [{ mimeType: 'image/jpeg', buffer: largeImage, order: 1 }],
  })

  const body = JSON.parse(calls[0].options.body)
  const sentImage = Buffer.from(body.messages[0].images[0], 'base64')
  const metadata = await sharp(sentImage).metadata()

  assert.equal(metadata.width, 768)
  assert.equal(metadata.height, 1024)
  assert.ok(sentImage.length < largeImage.length)
})

test('Ollama provider accepts structured JSON returned in the thinking field', async () => {
  const responses = [referencePage, submissionPage, suggestion]
  const provider = createOllamaAiProvider({
    model: 'qwen3-vl:2b',
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { message: { content: '', thinking: responses.shift() } }
      },
    }),
  })

  const result = await provider.evaluate(input)

  assert.equal(result.provider, 'ollama')
  assert.equal(result.coverage_score, 82)
})

test('Ollama provider salvages a truncated single-page transcription safely', async () => {
  const responses = [
    '{"transcription":"Nội dung trang đang được đọc dở',
    submissionPage,
    suggestion,
  ]
  const provider = createOllamaAiProvider({
    model: 'qwen3-vl:2b',
    fetchImpl: createFakeFetch(responses),
  })

  const result = await provider.evaluate(input)

  assert.match(result.reference_transcription, /Nội dung trang đang được đọc dở/)
  assert.equal(result.provider, 'ollama')
})

test('Ollama provider salvages required fields from a truncated evaluation JSON', async () => {
  const responses = [
    referencePage,
    submissionPage,
    '{"coverage_score":75,"confidence":0.6,"suggested_status":"REQUIRES_TEACHER_REVIEW","feedback_draft":"Cần giáo viên xem lại',
  ]
  const provider = createOllamaAiProvider({
    model: 'qwen3-vl:2b',
    fetchImpl: createFakeFetch(responses),
  })

  const result = await provider.evaluate(input)

  assert.equal(result.coverage_score, 75)
  assert.equal(result.suggested_status, 'REQUIRES_TEACHER_REVIEW')
})

test('Ollama provider normalizes unsafe evaluation values for teacher review', async () => {
  const invalidSuggestion = JSON.stringify({
    coverage_score: 150,
    confidence: 3,
    suggested_status: 'UNKNOWN',
    missing_content: Array.from({ length: 25 }, () => 'Ý còn thiếu.'),
    feedback_draft: 'Nhận xét từ mô hình local.',
  })
  const provider = createOllamaAiProvider({
    model: 'qwen3-vl:2b',
    fetchImpl: createFakeFetch([referencePage, submissionPage, invalidSuggestion]),
  })

  const result = await provider.evaluate(input)

  assert.equal(result.coverage_score, 100)
  assert.equal(result.confidence, 1)
  assert.equal(result.suggested_status, 'REQUIRES_TEACHER_REVIEW')
  assert.equal(result.missing_content.length, 20)
})

test('Ollama provider splits three or more images into context-safe transcription calls', async () => {
  const referenceTranscription = JSON.stringify({
    transcription: 'Trang mẫu.',
    uncertain_content: [],
  })
  const submissionTranscription = JSON.stringify({
    transcription: 'Nội dung bài nộp.',
    uncertain_content: [],
  })
  const calls = []
  const provider = createOllamaAiProvider({
    model: 'qwen3-vl:2b',
    fetchImpl: createFakeFetch([
      referenceTranscription,
      referenceTranscription,
      submissionTranscription,
      suggestion,
    ], calls),
  })

  const result = await provider.evaluate(multiImageInput)

  assert.equal(calls.length, 4)
  assert.equal(JSON.parse(calls[0].options.body).messages[0].images.length, 1)
  assert.equal(JSON.parse(calls[1].options.body).messages[0].images.length, 1)
  assert.equal(JSON.parse(calls[2].options.body).messages[0].images.length, 1)
  assert.match(result.reference_transcription, /Trang mẫu/)
  assert.match(result.student_transcription, /Nội dung bài nộp/)
})

test('Ollama provider retries one timed-out call before failing the evaluation', async () => {
  const responses = [referencePage, submissionPage, suggestion]
  let callCount = 0
  const provider = createOllamaAiProvider({
    model: 'qwen3-vl:2b',
    fetchImpl: async () => {
      callCount += 1
      if (callCount === 1) {
        const error = new Error('This operation was aborted')
        error.name = 'AbortError'
        throw error
      }
      return {
        ok: true,
        async json() {
          return { message: { content: responses.shift() } }
        },
      }
    },
  })

  const result = await provider.evaluate(input)

  assert.equal(result.provider, 'ollama')
  assert.equal(callCount, 4)
})

test('Ollama provider hides network and HTTP failures behind a stable error', async () => {
  const provider = createOllamaAiProvider({
    model: 'qwen3-vl:2b',
    fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: 'rate limit' }) }),
  })

  await assert.rejects(
    provider.evaluate(input),
    (error) => error instanceof AppError
      && error.status === 502
      && error.code === 'AI_PROVIDER_FAILED'
      && !error.message.includes('rate limit'),
  )
})

test('Ollama context failures use the same stable provider error', async () => {
  const provider = createOllamaAiProvider({
    model: 'qwen3-vl:2b',
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      text: async () => 'request exceeds the available context size',
    }),
  })

  await assert.rejects(
    provider.evaluate(input),
    (error) => error instanceof AppError
      && error.status === 502
      && error.code === 'AI_PROVIDER_FAILED',
  )
})

test('Ollama provider rejects malformed or schema-invalid JSON', async () => {
  for (const response of ['not json', JSON.stringify({ ...JSON.parse(suggestion), confidence: 2 })]) {
    const provider = createOllamaAiProvider({
      model: 'qwen3-vl:2b',
      fetchImpl: createFakeFetch([response, suggestion]),
    })

    await assert.rejects(
      provider.evaluate(input),
      (error) => error instanceof AppError
        && error.status === 502
        && error.code === 'AI_PROVIDER_INVALID_RESPONSE',
    )
  }
})
