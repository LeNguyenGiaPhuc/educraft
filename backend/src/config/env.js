import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source)

  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid environment variables: ${names}`)
  }

  return result.data
}
