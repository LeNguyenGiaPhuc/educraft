import { AppError } from '../../../common/errors.js'
import sharp from 'sharp'
import {
  AI_PROMPT_VERSION,
  buildEvaluationPrompt,
  evaluationSuggestionJsonSchema,
  parseEvaluationSuggestion,
  parseProviderResult,
  parseSingleImageTranscription,
  singleImageTranscriptionJsonSchema,
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

class OllamaContextError extends Error {}

function invalidProviderResponse() {
  return new AppError(
    502,
    'AI_PROVIDER_INVALID_RESPONSE',
    'Dịch vụ AI trả về dữ liệu không hợp lệ.',
  )
}

function responseText(response) {
  const content = response?.message?.content
  if (typeof content === 'string' && content.trim()) return content
  const thinking = response?.message?.thinking
  if (typeof thinking === 'string') return thinking
  if (typeof response?.response === 'string') return response.response
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

function extractPartialJsonString(raw, key) {
  const keyIndex = raw.indexOf(`"${key}"`)
  if (keyIndex < 0) return null
  const colonIndex = raw.indexOf(':', keyIndex)
  const quoteIndex = raw.indexOf('"', colonIndex + 1)
  if (colonIndex < 0 || quoteIndex < 0) return null

  for (let index = quoteIndex + 1; index < raw.length; index += 1) {
    if (raw[index] === '\\') {
      index += 1
      continue
    }
    if (raw[index] === '"') {
      try {
        return JSON.parse(raw.slice(quoteIndex, index + 1))
      } catch {
        return null
      }
    }
  }

  const fragment = raw.slice(quoteIndex + 1)
  for (let length = fragment.length; length > 0; length -= 1) {
    try {
      return JSON.parse(`"${fragment.slice(0, length)}"`)
    } catch {
      // Remove the last incomplete escape or character and try again.
    }
  }

  return null
}

function salvageSingleImageResponse(raw) {
  const transcription = extractPartialJsonString(raw, 'transcription')
  if (!transcription?.trim()) throw invalidProviderResponse()
  return {
    transcription: transcription.trim(),
    uncertain_content: [],
  }
}

function extractPartialJsonNumber(raw, key) {
  const match = raw.match(new RegExp(`"${key}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`))
  return match ? Number(match[1]) : null
}

function salvageEvaluationResponse(raw) {
  const coverageScore = extractPartialJsonNumber(raw, 'coverage_score')
  const confidence = extractPartialJsonNumber(raw, 'confidence')
  const suggestedStatus = extractPartialJsonString(raw, 'suggested_status')
  const feedbackDraft = extractPartialJsonString(raw, 'feedback_draft')
  if (coverageScore === null || confidence === null || !suggestedStatus || !feedbackDraft) {
    throw invalidProviderResponse()
  }

  return {
    coverage_score: coverageScore,
    confidence,
    suggested_status: suggestedStatus,
    missing_content: [],
    feedback_draft: feedbackDraft,
  }
}

function normalizeEvaluationValue(value) {
  const coverageScore = Number(value?.coverage_score)
  const confidence = Number(value?.confidence)
  const suggestedStatuses = new Set([
    'COMPLETED',
    'NEEDS_COMPLETION',
    'REQUIRES_TEACHER_REVIEW',
  ])
  const missingContent = Array.isArray(value?.missing_content)
    ? value.missing_content
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => item.trim().slice(0, 500))
      .slice(0, 20)
    : []
  const feedbackDraft = typeof value?.feedback_draft === 'string' && value.feedback_draft.trim()
    ? value.feedback_draft.trim().slice(0, 2000)
    : 'Mô hình local chưa đưa ra nhận xét đầy đủ; giáo viên cần xem lại bài nộp.'

  return {
    coverage_score: Number.isFinite(coverageScore)
      ? Math.min(100, Math.max(0, coverageScore))
      : 0,
    confidence: Number.isFinite(confidence)
      ? Math.min(1, Math.max(0, confidence))
      : 0,
    suggested_status: suggestedStatuses.has(value?.suggested_status)
      ? value.suggested_status
      : 'REQUIRES_TEACHER_REVIEW',
    missing_content: missingContent,
    feedback_draft: feedbackDraft,
  }
}

function parseJsonResponse(response, parser) {
  const raw = cleanJsonText(responseText(response))
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    if (parser === parseSingleImageTranscription) {
      return parser(salvageSingleImageResponse(raw))
    }
    if (parser === parseEvaluationSuggestion) {
      return parser(salvageEvaluationResponse(raw))
    }
    throw invalidProviderResponse()
  }

  try {
    return parser(value)
  } catch (error) {
    if (parser === parseEvaluationSuggestion && error instanceof AppError) {
      return parser(normalizeEvaluationValue(value))
    }
    throw error
  }
}

const OLLAMA_MAX_IMAGE_DIMENSION = 1024

async function prepareOllamaImage(image) {
  const metadata = await sharp(image.buffer).metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0

  if (width <= OLLAMA_MAX_IMAGE_DIMENSION && height <= OLLAMA_MAX_IMAGE_DIMENSION) {
    return image.buffer
  }

  return sharp(image.buffer)
    .rotate()
    .resize({
      width: OLLAMA_MAX_IMAGE_DIMENSION,
      height: OLLAMA_MAX_IMAGE_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toBuffer()
}

async function imageMessage(prompt, images) {
  const preparedImages = await Promise.all(images.map(prepareOllamaImage))
  return {
    role: 'user',
    content: prompt,
    images: preparedImages.map((buffer) => buffer.toString('base64')),
  }
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl ?? '').trim().replace(/\/+$/, '')
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'ABORT_ERR'
}

export function createOllamaAiProvider({
  baseUrl = 'http://127.0.0.1:11434',
  model = 'qwen3-vl:2b',
  timeoutMs = 60000,
  temperature = 0.1,
  numCtx = 4096,
  numPredict = 512,
  fetchImpl = globalThis.fetch,
  now = Date.now,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  if (!normalizedBaseUrl || typeof fetchImpl !== 'function') throw providerUnavailable()

  async function createChat({ content, images = [], schema }) {
    let message
    try {
      message = await imageMessage(content, images)
    } catch (error) {
      console.error('[Ollama AI Image Error]', error?.message ?? error)
      throw providerFailed()
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetchImpl(`${normalizedBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [message],
            stream: false,
            format: schema,
            think: false,
            options: {
              temperature,
              num_ctx: numCtx,
              num_predict: numPredict,
            },
          }),
        })

        if (!response?.ok) {
          const errorBody = typeof response?.text === 'function' ? await response.text() : ''
          if (response?.status === 400 && /context size|exceed.*context/i.test(errorBody)) {
            throw new OllamaContextError('Ollama context limit exceeded')
          }
          throw new Error(`Ollama request failed with status ${response?.status ?? 'unknown'}`)
        }
        return await response.json()
      } catch (error) {
        if (error instanceof AppError) throw error
        if (isAbortError(error) && attempt === 0) {
          console.warn('[Ollama AI Provider Retry] Request timed out; retrying once.')
          continue
        }
        console.error('[Ollama AI Provider Error]', error?.message ?? error)
        throw providerFailed()
      } finally {
        clearTimeout(timer)
      }
    }

    throw providerFailed()
  }

  async function transcribePage(image, source) {
    const response = await createChat({
      content: [
        'Bạn là bộ phận đọc một trang ảnh cho hệ thống EduCraft.',
        `Ảnh này là ${source === 'reference' ? 'bài mẫu' : 'bài nộp của học sinh'}.`,
        'Chỉ trả về đúng một JSON theo schema. Tóm tắt chính xác nội dung nhìn thấy trong tối đa 120 từ.',
        'Không lặp câu, không bịa nội dung, không thêm markdown hoặc lời giải thích.',
        'Nếu chữ khó đọc, ghi ngắn gọn phần chắc chắn và thêm mục uncertain_content.',
      ].join('\n'),
      images: [image],
      schema: singleImageTranscriptionJsonSchema,
    })
    return parseJsonResponse(response, parseSingleImageTranscription)
  }

  async function transcribeInput(input) {
    const referenceResults = []
    for (const image of input.referenceImages) {
      referenceResults.push(await transcribePage(image, 'reference'))
    }

    const submissionResults = []
    for (const image of input.submissionImages) {
      submissionResults.push(await transcribePage(image, 'submission'))
    }

    return {
      reference_transcription: referenceResults.map((result) => result.transcription).join('\n\n'),
      student_transcription: submissionResults.map((result) => result.transcription).join('\n\n'),
      uncertain_content: [
        ...referenceResults.flatMap((result) => result.uncertain_content),
        ...submissionResults.flatMap((result) => result.uncertain_content),
      ],
    }
  }

  return {
    async evaluate(input) {
      const startedAt = now()
      const transcription = await transcribeInput(input)

      const evaluationResponse = await createChat({
        content: buildEvaluationPrompt({
          assignmentTitle: input.assignmentTitle,
          coverageThreshold: input.coverageThreshold,
          referenceTranscription: transcription.reference_transcription,
          studentTranscription: transcription.student_transcription,
        }),
        schema: evaluationSuggestionJsonSchema,
      })
      const suggestion = parseJsonResponse(evaluationResponse, parseEvaluationSuggestion)

      return parseProviderResult({
        ...suggestion,
        ...transcription,
        provider: 'ollama',
        model_name: model,
        model_version: model,
        prompt_version: AI_PROMPT_VERSION,
        latency_ms: Math.max(0, now() - startedAt),
      })
    },
  }
}
