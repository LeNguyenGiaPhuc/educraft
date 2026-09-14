import { z } from 'zod'

export const classIdParamsSchema = {
  params: z.object({ classId: z.string().uuid('ID không hợp lệ.') }),
}

export const classCodeParamsSchema = {
  params: z.object({ classCode: z.string().trim().min(1, 'Mã lớp không được để trống.') }),
}

export const classListQuerySchema = {
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  }).strict(),
}

export const createClassSchema = {
  body: z.object({
    code: z.string().trim().min(1, 'Mã lớp không được để trống.').max(30, 'Mã lớp quá dài.'),
    subject: z.string().trim().min(1, 'Môn học không được để trống.').max(120, 'Môn học quá dài.'),
    semester: z.string().trim().min(1, 'Học kỳ không được để trống.').max(30, 'Học kỳ quá dài.'),
    school_year: z.string().trim().min(1, 'Năm học không được để trống.').max(20, 'Năm học quá dài.'),
    teacher_id: z.string().uuid('ID giáo viên không hợp lệ.').optional().nullable(),
    status: z.enum(['ACTIVE', 'ARCHIVED'], { error: 'Trạng thái lớp không hợp lệ.' }).default('ACTIVE'),
  }).strict(),
}

export const updateClassSchema = {
  params: classIdParamsSchema.params,
  body: z.object({
    code: z.string().trim().min(1, 'Mã lớp không được để trống.').max(30, 'Mã lớp quá dài.').optional(),
    subject: z.string().trim().min(1, 'Môn học không được để trống.').max(120, 'Môn học quá dài.').optional(),
    semester: z.string().trim().min(1, 'Học kỳ không được để trống.').max(30, 'Học kỳ quá dài.').optional(),
    school_year: z.string().trim().min(1, 'Năm học không được để trống.').max(20, 'Năm học quá dài.').optional(),
    teacher_id: z.string().uuid('ID giáo viên không hợp lệ.').optional().nullable(),
    status: z.enum(['ACTIVE', 'ARCHIVED'], { error: 'Trạng thái lớp không hợp lệ.' }).optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, {
    message: 'Cần cung cấp ít nhất một trường để cập nhật.',
  }),
}

export const assignTeacherSchema = {
  params: classIdParamsSchema.params,
  body: z.object({
    teacher_id: z.string().uuid('ID giáo viên không hợp lệ.'),
  }).strict(),
}

export const addStudentSchema = {
  params: classIdParamsSchema.params,
  body: z.object({
    student_id: z.string().uuid('ID học sinh không hợp lệ.'),
    student_number: z.string().trim().min(1, 'Số thứ tự học sinh không được để trống.').max(20, 'Số thứ tự học sinh quá dài.'),
  }).strict(),
}

export const removeStudentSchema = {
  params: classIdParamsSchema.params,
  body: z.object({
    student_id: z.string().uuid('ID học sinh không hợp lệ.'),
  }).strict(),
}

export const importStudentsSchema = {
  params: classIdParamsSchema.params,
  body: z.object({
    students: z.array(z.object({
      studentNumber: z.string().trim().min(1, 'Số thứ tự học sinh không được để trống.').max(20, 'Số thứ tự học sinh quá dài.'),
      name: z.string().trim().min(1, 'Họ tên không được để trống.').max(120, 'Họ tên quá dài.'),
      email: z.string().trim().toLowerCase().email('Email không hợp lệ.'),
    }).strict()).min(1, 'Cần ít nhất một học sinh để import.'),
  }).strict(),
}
