import { z } from 'zod'

export const submissionParamsSchema = {
  params: z.object({
    assignmentId: z.uuid('ID bài kiểm tra không hợp lệ.'),
  }),
}
