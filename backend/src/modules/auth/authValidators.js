import { z } from 'zod'

export const loginSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Email không hợp lệ.'),
    password: z.string().min(1, 'Nhập mật khẩu.'),
  }),
}
