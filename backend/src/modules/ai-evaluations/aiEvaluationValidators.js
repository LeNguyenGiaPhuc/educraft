import { z } from 'zod'

export const aiEvaluationParamsSchema = {
  params: z.object({
    submissionId: z.uuid('ID lượt nộp bài không hợp lệ.'),
  }),
}
