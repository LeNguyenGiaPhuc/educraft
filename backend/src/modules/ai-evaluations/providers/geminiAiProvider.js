import { GoogleGenAI } from '@google/genai'

import { AppError } from '../../../common/errors.js'
import {
  AI_PROMPT_VERSION,
  buildEvaluationPrompt,
  buildTranscriptionPrompt,
  evaluationSuggestionJsonSchema,
  parseEvaluationSuggestion,
  parseProviderResult,
  parseTranscriptionResult,
  transcriptionJsonSchema,
} from '../aiEvaluationSchema.js'

function providerUnavailable() {
  return new AppError(
    503,
    'AI_PROVIDER_UNAVAILABLE',
    'Dịch vụ AI chưa được cấu hình.',
  )
}

function providerFailed() {
  return new AppError(
    502,
    'AI_PROVIDER_FAILED',
    'Dịch vụ AI tạm thời không thể xử lý ảnh.',
  )
}

function invalidProviderResponse() {
  return new AppError(
    502,
    'AI_PROVIDER_INVALID_RESPONSE',
    'Dịch vụ AI trả về dữ liệu không hợp lệ.',
  )
}

function responseText(response) {
  if (typeof response?.output_text === 'string') return response.output_text
  if (typeof response?.outputText === 'string') return response.outputText
  if (typeof response?.outputText === 'function') return response.outputText()

  const output = Array.isArray(response?.outputs) ? response.outputs.at(-1) : null
  if (typeof output?.text === 'string') return output.text
  if (typeof output?.content?.[0]?.text === 'string') return output.content[0].text

  throw invalidProviderResponse()
}

function cleanJsonText(raw) {
  if (typeof raw !== 'string') return ''
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function imagePart(image) {
  return {
    type: 'image',
    data: image.buffer.toString('base64'),
    mime_type: image.mimeType,
  }
}

function withTimeout(operationFactory, timeoutMs) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI provider timeout')), timeoutMs)
  })
  const operation = Promise.resolve().then(operationFactory)

  return Promise.race([operation, timeout]).finally(() => clearTimeout(timer))
}

function responseFormat(schema) {
  return {
    type: 'text',
    mime_type: 'application/json',
    schema,
  }
}

function parseJsonResponse(response, parser) {
  let value
  try {
    value = JSON.parse(cleanJsonText(responseText(response)))
  } catch {
    throw invalidProviderResponse()
  }

  return parser(value)
}

export function createGeminiAiProvider({
  apiKey,
  model = 'gemini-3.5-flash-lite',
  timeoutMs = 30000,
  temperature = 0.1,
  client,
  now = Date.now,
} = {}) {
  if (!client && !String(apiKey ?? '').trim()) throw providerUnavailable()

  const ai = client ?? new GoogleGenAI({ apiKey })

  async function createInteraction(request) {
    try {
      return await withTimeout(
        () => ai.interactions.create({
          ...request,
          store: false,
          generation_config: {
            temperature,
          },
        }, { timeout: timeoutMs }),
        timeoutMs,
      )
    } catch (error) {
      if (error instanceof AppError) throw error
      console.error('[Gemini AI Provider Error]', error?.status ?? '', error?.message ?? error)
      throw providerFailed()
    }
  }

  return {
    async evaluate(input) {
      const startedAt = now()
      const transcriptionInput = [
        {
          type: 'text',
          text: buildTranscriptionPrompt({
            referenceCount: input.referenceImages.length,
            submissionCount: input.submissionImages.length,
          }),
        },
        ...input.referenceImages.map(imagePart),
        { type: 'text', text: '--- HẾT BÀI MẪU; BẮT ĐẦU BÀI NỘP ---' },
        ...input.submissionImages.map(imagePart),
      ]

      const transcriptionResponse = await createInteraction({
        model,
        input: transcriptionInput,
        response_format: responseFormat(transcriptionJsonSchema),
      })
      const transcription = parseJsonResponse(transcriptionResponse, parseTranscriptionResult)

      const evaluationResponse = await createInteraction({
        model,
        input: buildEvaluationPrompt({
          assignmentTitle: input.assignmentTitle,
          coverageThreshold: input.coverageThreshold,
          referenceTranscription: transcription.reference_transcription,
          studentTranscription: transcription.student_transcription,
        }),
        response_format: responseFormat(evaluationSuggestionJsonSchema),
      })
      const suggestion = parseJsonResponse(evaluationResponse, parseEvaluationSuggestion)

      return parseProviderResult({
        ...suggestion,
        ...transcription,
        provider: 'gemini',
        model_name: model,
        model_version: model,
        prompt_version: AI_PROMPT_VERSION,
        latency_ms: Math.max(0, now() - startedAt),
      })
    }
  }
}
