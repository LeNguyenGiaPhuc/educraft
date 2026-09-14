import { z } from 'zod'

export const accountIdParamsSchema = {
  params: z.object({
    accountId: z.string().uuid('ID không hợp lệ.'),
  }),
}

export const accountListQuerySchema = {
  query: z.object({
    search: z.string().trim().optional(),
    role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'LOCKED']).optional(),
  }).strict(),
}

export const createAccountSchema = {
  body: z.object({
    username: z.string().trim().min(1, 'Tên đăng nhập không được để trống.').max(50, 'Tên đăng nhập quá dài.'),
    full_name: z.string().trim().min(1, 'Họ tên không được để trống.').max(120, 'Họ tên quá dài.'),
    email: z.string().trim().toLowerCase().email('Email không hợp lệ.'),
    role: z.enum(['ADMIN', 'TEACHER', 'STUDENT'], { error: 'Vai trò không hợp lệ.' }),
    status: z.enum(['PENDING', 'ACTIVE', 'LOCKED'], { error: 'Trạng thái không hợp lệ.' }).default('PENDING'),
    student_code: z.string().trim().max(30).optional().nullable(),
  }).strict(),
}

export const updateAccountSchema = {
  params: accountIdParamsSchema.params,
  body: z.object({
    username: z.string().trim().min(1, 'Tên đăng nhập không được để trống.').max(50, 'Tên đăng nhập quá dài.').optional(),
    full_name: z.string().trim().min(1, 'Họ tên không được để trống.').max(120, 'Họ tên quá dài.').optional(),
    email: z.string().trim().toLowerCase().email('Email không hợp lệ.').optional(),
    role: z.enum(['ADMIN', 'TEACHER', 'STUDENT'], { error: 'Vai trò không hợp lệ.' }).optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'LOCKED'], { error: 'Trạng thái không hợp lệ.' }).optional(),
    student_code: z.string().trim().max(30).optional().nullable(),
  }).strict().refine((body) => Object.keys(body).length > 0, {
    message: 'Cần cung cấp ít nhất một trường để cập nhật.',
  }),
}

export const lockAccountSchema = {
  params: accountIdParamsSchema.params,
}
