import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import { createGeminiAiProvider } from '../src/modules/ai-evaluations/providers/geminiAiProvider.js'

const input = {
  assignmentTitle: 'Lực ma sát',
  coverageThreshold: 80,
  referenceImages: [{ mimeType: 'image/jpeg', buffer: Buffer.from('reference'), order: 1 }],
  submissionImages: [{ mimeType: 'image/png', buffer: Buffer.from('submission'), order: 1 }],
}

const transcription = JSON.stringify({
  reference_transcription: 'Lực ma sát là lực cản trở chuyển động.',
  student_transcription: 'Lực ma sát cản trở chuyển động.',
  uncertain_content: [],
})

const suggestion = JSON.stringify({
  coverage_score: 82,
  confidence: 0.84,
  suggested_status: 'REQUIRES_TEACHER_REVIEW',
  missing_content: ['Bổ sung phần kết luận.'],
  feedback_draft: 'Bài làm đủ ý chính nhưng cần bổ sung phần kết luận.',
})

function createFakeClient(responses, requests = []) {
  return {
    requests,
    interactions: {
      async create(request) {
        requests.push(request)
        return { output_text: responses.shift() }
      },
    },
  }
}

test('Gemini provider sends ordered image bytes and returns validated metadata', async () => {
  const requests = []
  const client = createFakeClient([transcription, suggestion], requests)
  const timestamps = [1000, 1125]
  const provider = createGeminiAiProvider({
    apiKey: 'test-key',
    model: 'gemini-3.8-flash',
    client,
    now: () => timestamps.shift(),
  })

  const result = await provider.evaluate(input)

  assert.equal(result.provider, 'gemini')
  assert.equal(result.model_name, 'gemini-3.8-flash')
  assert.equal(result.latency_ms, 125)
  assert.equal(requests.length, 2)
  assert.equal(requests[0].input[1].data, Buffer.from('reference').toString('base64'))
  assert.equal(requests[0].input[3].data, Buffer.from('submission').toString('base64'))
  assert.equal(requests[0].input[1].mime_type, 'image/jpeg')
  assert.equal(requests[0].input[3].mime_type, 'image/png')
  assert.match(requests[1].input, /Lực ma sát/)
  assert.doesNotMatch(requests[1].input, /student@example|studentId|email/i)
})

test('Gemini provider hides provider failures behind a stable error', async () => {
  const client = {
    interactions: {
      async create() {
        throw new Error('provider secret')
      },
    },
  }
  const provider = createGeminiAiProvider({
    apiKey: 'test-key',
    model: 'gemini-3.8-flash',
    client,
  })

  await assert.rejects(
    provider.evaluate(input),
    (error) => error instanceof AppError
      && error.status === 502
      && error.code === 'AI_PROVIDER_FAILED'
      && !error.message.includes('provider secret'),
  )
})

test('Gemini provider rejects malformed or schema-invalid JSON', async () => {
  for (const response of ['not json', JSON.stringify({ ...JSON.parse(suggestion), confidence: 2 })]) {
    const provider = createGeminiAiProvider({
      apiKey: 'test-key',
      client: createFakeClient([response, suggestion]),
    })

    await assert.rejects(
      provider.evaluate(input),
      (error) => error instanceof AppError
        && error.status === 502
        && error.code === 'AI_PROVIDER_INVALID_RESPONSE',
    )
  }
})

test('Gemini provider maps a timeout to a stable failure', async () => {
  const client = {
    interactions: {
      create: () => new Promise(() => {}),
    },
  }
  const provider = createGeminiAiProvider({
    apiKey: 'test-key',
    client,
    timeoutMs: 10,
  })

  await assert.rejects(
    provider.evaluate(input),
    (error) => error instanceof AppError
      && error.status === 502
      && error.code === 'AI_PROVIDER_FAILED',
  )
})

test('Gemini provider passes timeout through SDK options instead of the request body', async () => {
  const calls = []
  const responses = [transcription, suggestion]
  const client = {
    interactions: {
      async create(request, options) {
        calls.push({ request, options })
        return { output_text: responses.shift() }
      },
    },
  }
  const provider = createGeminiAiProvider({
    apiKey: 'test-key',
    client,
    timeoutMs: 4321,
  })

  await provider.evaluate(input)

  assert.equal(calls.length, 2)
  for (const call of calls) {
    assert.deepEqual(call.options, { timeout: 4321 })
    assert.equal(Object.hasOwn(call.request, 'signal'), false)
  }
})
