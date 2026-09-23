import { z } from 'zod'

import { AppError } from '../../common/errors.js'

export const AI_PROMPT_VERSION = 'handwriting-v1'

const uncertainContentSchema = z.object({
  source: z.enum(['reference', 'submission']),
  page: z.number().int().positive(),
  text: z.string().trim().min(1).max(500),
  reason: z.string().trim().min(1).max(500),
}).strict()

const transcriptionSchema = z.object({
  reference_transcription: z.string().trim().min(1).max(30000),
  student_transcription: z.string().trim().min(1).max(30000),
  uncertain_content: z.array(uncertainContentSchema).max(50),
}).strict()

const singleImageTranscriptionSchema = z.object({
  transcription: z.string().trim().min(1).max(12000),
  uncertain_content: z.array(uncertainContentSchema).max(50),
}).strict()

const evaluationSuggestionSchema = z.object({
  coverage_score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  suggested_status: z.enum([
    'COMPLETED',
    'NEEDS_COMPLETION',
    'REQUIRES_TEACHER_REVIEW',
  ]),
  missing_content: z.array(z.string().trim().min(1).max(500)).max(20),
  feedback_draft: z.string().trim().min(1).max(2000),
}).strict()

export const providerResultSchema = transcriptionSchema.merge(evaluationSuggestionSchema).extend({
  provider: z.enum(['gemini', 'ollama']),
  model_name: z.string().trim().min(1).max(200),
  model_version: z.string().trim().min(1).max(200),
  prompt_version: z.string().trim().min(1).max(100),
  latency_ms: z.number().int().nonnegative(),
}).strict()

export const transcriptionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reference_transcription: { type: 'string' },
    student_transcription: { type: 'string' },
    uncertain_content: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          source: { type: 'string', enum: ['reference', 'submission'] },
          page: { type: 'integer', minimum: 1 },
          text: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['source', 'page', 'text', 'reason'],
      },
    },
  },
  required: ['reference_transcription', 'student_transcription', 'uncertain_content'],
}

export const singleImageTranscriptionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    transcription: { type: 'string' },
    uncertain_content: transcriptionJsonSchema.properties.uncertain_content,
  },
  required: ['transcription', 'uncertain_content'],
}

export const evaluationSuggestionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    coverage_score: { type: 'number', minimum: 0, maximum: 100 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    suggested_status: {
      type: 'string',
      enum: ['COMPLETED', 'NEEDS_COMPLETION', 'REQUIRES_TEACHER_REVIEW'],
    },
    missing_content: {
      type: 'array',
      items: { type: 'string' },
    },
    feedback_draft: { type: 'string' },
  },
  required: [
    'coverage_score',
    'confidence',
    'suggested_status',
    'missing_content',
    'feedback_draft',
  ],
}

export function parseProviderResult(value) {
  const result = providerResultSchema.safeParse(value)
  if (!result.success) {
    throw new AppError(
      502,
      'AI_PROVIDER_INVALID_RESPONSE',
      'Dịch vụ AI trả về dữ liệu không hợp lệ.',
    )
  }

  return result.data
}

export function parseTranscriptionResult(value) {
  const result = transcriptionSchema.safeParse(value)
  if (!result.success) {
    throw new AppError(
      502,
      'AI_PROVIDER_INVALID_RESPONSE',
      'Dịch vụ AI trả về bản chép không hợp lệ.',
    )
  }

  return result.data
}

export function parseSingleImageTranscription(value) {
  const result = singleImageTranscriptionSchema.safeParse(value)
  if (!result.success) {
    throw new AppError(
      502,
      'AI_PROVIDER_INVALID_RESPONSE',
      'Dịch vụ AI trả về bản chép không hợp lệ.',
    )
  }

  return result.data
}

export function parseEvaluationSuggestion(value) {
  const result = evaluationSuggestionSchema.safeParse(value)
  if (!result.success) {
    throw new AppError(
      502,
      'AI_PROVIDER_INVALID_RESPONSE',
      'Dịch vụ AI trả về gợi ý không hợp lệ.',
    )
  }

  return result.data
}

export function buildTranscriptionPrompt({ referenceCount, submissionCount }) {
  return [
    'Bạn là bộ phận đọc bài viết tay tiếng Việt cho hệ thống EduCraft.',
    `Có ${referenceCount} ảnh bài mẫu và ${submissionCount} ảnh bài nộp; giữ đúng thứ tự trang.`,
    'Trích xuất nguyên văn nội dung nhìn thấy, giữ dấu tiếng Việt, tiêu đề, gạch đầu dòng, công thức và ký hiệu.',
    'Tách nội dung bài học sinh khỏi ghi chú hoặc nhận xét của giáo viên (thường có màu khác); không đưa ghi chú giáo viên vào student_transcription.',
    'Nếu một đoạn không chắc chắn, ghi phần gần đúng ở uncertain_content và giải thích lý do; không tự bịa chữ.',
    'Nếu trang không có chữ rõ ràng, ghi một mô tả ngắn thay vì để chuỗi rỗng.',
    'Chỉ trả về JSON đúng schema được cung cấp, không thêm markdown hay lời giải thích bên ngoài JSON.',
  ].join('\n')
}

export function buildEvaluationPrompt({
  assignmentTitle,
  coverageThreshold,
  referenceTranscription,
  studentTranscription,
}) {
  return [
    'Bạn là trợ lý tạo gợi ý nhận xét cho giáo viên EduCraft, không phải người chốt điểm cuối cùng.',
    `Tên bài: ${JSON.stringify(String(assignmentTitle ?? ''))}.`,
    `Ngưỡng bao phủ của bài kiểm tra: ${coverageThreshold}%.`,
    'So sánh nội dung bài nộp với bài mẫu; không suy đoán thông tin không có trong hai bản chép.',
    'Tính coverage_score trong khoảng 0 đến 100, confidence trong khoảng 0 đến 1.',
    'Nếu có uncertainty hoặc bằng chứng chưa đủ, nêu rõ trong missing_content và feedback_draft để giáo viên xem lại.',
    'suggested_status chỉ là trường tham khảo; hệ thống sẽ quyết định lại theo coverage_score và ngưỡng của bài kiểm tra.',
    'missing_content phải nêu các ý còn thiếu; feedback_draft phải là nhận xét tiếng Việt ngắn, lịch sự và có thể chỉnh sửa.',
    'Đây chỉ là gợi ý để giáo viên xem lại; không tự chốt kết quả.',
    'BÀI MẪU:',
    String(referenceTranscription ?? ''),
    'BÀI NỘP:',
    String(studentTranscription ?? ''),
    'Chỉ trả về JSON đúng schema được cung cấp, không thêm markdown hay lời giải thích bên ngoài JSON.',
  ].join('\n')
}
