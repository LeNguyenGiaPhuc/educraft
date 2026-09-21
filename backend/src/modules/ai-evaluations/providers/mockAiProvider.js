import {
  AI_PROMPT_VERSION,
  parseProviderResult,
} from '../aiEvaluationSchema.js'

export function createMockAiProvider() {
  return {
    async evaluate() {
      return parseProviderResult({
        coverage_score: 82,
        confidence: 0.84,
        suggested_status: 'REQUIRES_TEACHER_REVIEW',
        missing_content: ['Bổ sung phần kết luận.'],
        feedback_draft: 'Đánh giá mô phỏng: bài ghi đủ ý chính, cần giáo viên xem lại phần kết luận.',
        reference_transcription: 'Bản chép mô phỏng từ bài mẫu.',
        student_transcription: 'Bản chép mô phỏng từ bài nộp.',
        uncertain_content: [],
        provider: 'mock',
        model_name: 'educraft-mock-evaluator',
        model_version: '1.0',
        prompt_version: AI_PROMPT_VERSION,
        latency_ms: 0,
      })
    },
  }
}
