import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import {
  AI_PROMPT_VERSION,
  buildEvaluationPrompt,
  buildTranscriptionPrompt,
  parseProviderResult,
} from '../src/modules/ai-evaluations/aiEvaluationSchema.js'

const validResult = {
  coverage_score: 82,
  confidence: 0.84,
  suggested_status: 'REQUIRES_TEACHER_REVIEW',
  missing_content: ['Bổ sung phần kết luận.'],
  feedback_draft: 'Bài làm đủ ý chính nhưng cần bổ sung phần kết luận.',
  reference_transcription: 'Lực ma sát là lực cản trở chuyển động tương đối giữa hai bề mặt.',
  student_transcription: 'Lực ma sát cản trở chuyển động giữa hai bề mặt.',
  uncertain_content: [{
    source: 'submission',
    page: 1,
    text: 'đoạn cuối trang',
    reason: 'Chữ bị mờ ở mép ảnh.',
  }],
  provider: 'gemini',
  model_name: 'gemini-3.8-flash',
  model_version: 'gemini-3.8-flash',
  prompt_version: AI_PROMPT_VERSION,
  latency_ms: 1250,
}

test('parseProviderResult returns the strict normalized evaluation contract', () => {
  assert.deepEqual(parseProviderResult(validResult), validResult)
})

test('parseProviderResult rejects unsafe numeric and status values', () => {
  for (const [field, value] of [
    ['coverage_score', -1],
    ['confidence', 1.2],
    ['suggested_status', 'AUTO_PASS'],
    ['latency_ms', -1],
  ]) {
    assert.throws(
      () => parseProviderResult({ ...validResult, [field]: value }),
      (error) => error instanceof AppError
        && error.status === 502
        && error.code === 'AI_PROVIDER_INVALID_RESPONSE',
    )
  }
})

test('parseProviderResult rejects blank transcriptions and unknown fields', () => {
  assert.throws(
    () => parseProviderResult({ ...validResult, student_transcription: '   ' }),
    (error) => error instanceof AppError && error.code === 'AI_PROVIDER_INVALID_RESPONSE',
  )
  assert.throws(
    () => parseProviderResult({ ...validResult, private_prompt: 'secret' }),
    (error) => error instanceof AppError && error.code === 'AI_PROVIDER_INVALID_RESPONSE',
  )
})

test('prompts instruct the model to preserve Vietnamese text and report uncertainty', () => {
  const transcriptionPrompt = buildTranscriptionPrompt({
    referenceCount: 1,
    submissionCount: 1,
  })
  const evaluationPrompt = buildEvaluationPrompt({
    assignmentTitle: 'Lực ma sát',
    coverageThreshold: 80,
    referenceTranscription: validResult.reference_transcription,
    studentTranscription: validResult.student_transcription,
  })

  assert.match(transcriptionPrompt, /tiếng Việt/i)
  assert.match(transcriptionPrompt, /không chắc chắn/i)
  assert.match(transcriptionPrompt, /ghi chú.*giáo viên/i)
  assert.match(evaluationPrompt, /80/)
  assert.match(evaluationPrompt, /gợi ý/i)
  assert.doesNotMatch(`${transcriptionPrompt} ${evaluationPrompt}`, /student@example|studentId|email/i)
})
