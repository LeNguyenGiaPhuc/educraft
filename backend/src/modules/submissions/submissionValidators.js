import { z } from 'zod'

export const submissionParamsSchema = {
  params: z.object({
    assignmentId: z.uuid('ID bài kiểm tra không hợp lệ.'),
  }),
}

export const submissionDetailParamsSchema = {
  params: z.object({
    submissionId: z.uuid('ID lượt nộp bài không hợp lệ.'),
  }),
}
