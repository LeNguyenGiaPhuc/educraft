import { z } from 'zod'

export const ASSIGNMENT_STATUSES = Object.freeze(['DRAFT', 'OPEN', 'CLOSED'])

const identifier = z.uuid('ID không hợp lệ.')
const title = z.string()
  .trim()
  .min(1, 'Nhập tên bài kiểm tra.')
  .max(160, 'Tên bài kiểm tra không vượt quá 160 ký tự.')
const dueAt = z.string()
  .trim()
  .pipe(z.iso.datetime({
    offset: true,
    error: 'Hạn nộp phải là thời gian RFC 3339 có múi giờ.',
  }))
const coverageThreshold = z.number()
  .min(0, 'Ngưỡng đạt phải từ 0 đến 100.')
  .max(100, 'Ngưỡng đạt phải từ 0 đến 100.')
const status = z.enum(ASSIGNMENT_STATUSES, {
  error: 'Trạng thái bài kiểm tra không hợp lệ.',
})

export const classIdParamsSchema = {
  params: z.object({ classId: identifier }),
}

export const assignmentIdParamsSchema = {
  params: z.object({ assignmentId: identifier }),
}

export const createAssignmentSchema = {
  params: classIdParamsSchema.params,
  body: z.object({
    title,
    due_at: dueAt,
    coverage_threshold: coverageThreshold.default(80),
    status: status.default('DRAFT'),
  }).strict(),
}

export const updateAssignmentSchema = {
  params: assignmentIdParamsSchema.params,
  body: z.object({
    title: title.optional(),
    due_at: dueAt.optional(),
    coverage_threshold: coverageThreshold.optional(),
    status: status.optional(),
  })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Cần cung cấp ít nhất một trường để cập nhật.',
    }),
}
