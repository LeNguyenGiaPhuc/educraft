import { z } from 'zod'

const identifier = z.uuid('ID không hợp lệ.')

export const referenceAssignmentParamsSchema = {
  params: z.object({ assignmentId: identifier }),
}

export const referenceParamsSchema = {
  params: z.object({
    assignmentId: identifier,
    referenceId: identifier,
  }),
}
