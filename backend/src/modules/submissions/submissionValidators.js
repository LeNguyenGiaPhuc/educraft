import { z } from 'zod'

const submissionId = z.uuid('ID lượt nộp bài không hợp lệ.')

export const submissionParamsSchema = {
  params: z.object({
    assignmentId: z.uuid('ID bài kiểm tra không hợp lệ.'),
  }),
}

export const submissionDetailParamsSchema = {
  params: z.object({
    submissionId,
  }),
}

export const finalizeSubmissionSchema = {
  params: z.object({ submissionId }),
  body: z.object({
    final_status: z.enum(['COMPLETED', 'NEEDS_COMPLETION'], {
      error: 'Trạng thái kết quả không hợp lệ.',
    }),
    final_score: z.number('Điểm cuối phải là số.')
      .min(0, 'Điểm cuối phải từ 0 đến 100.')
      .max(100, 'Điểm cuối phải từ 0 đến 100.')
      .optional(),
    feedback: z.string('Nhận xét cuối là bắt buộc.')
      .trim()
      .min(1, 'Nhận xét cuối không được để trống.'),
  }).strict(),
}
