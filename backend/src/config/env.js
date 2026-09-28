import { z } from 'zod'

const optionalEnvString = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().min(1).optional(),
)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  AI_PROVIDER: z.enum(['gemini', 'ollama']).default('ollama'),
  GEMINI_API_KEY: optionalEnvString,
  GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
  OLLAMA_BASE_URL: z.string().url().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().min(1).default('qwen3-vl:2b'),
  OLLAMA_NUM_CTX: z.coerce.number().int().min(2048).max(262144).default(4096),
  OLLAMA_NUM_PREDICT: z.coerce.number().int().min(256).max(8192).default(512),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  AI_MAX_REFERENCE_IMAGES: z.coerce.number().int().min(1).max(10).default(4),
  AI_MAX_TOTAL_BYTES: z.coerce.number().int().min(1).default(15 * 1024 * 1024),
  OLLAMA_EMBEDDING_MODEL: z.string().min(1).default('nomic-embed-text-v2-moe:latest'),
  RAG_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(768),
  RAG_CHUNK_SIZE: z.coerce.number().int().min(100).max(4000).default(800),
  RAG_CHUNK_OVERLAP: z.coerce.number().int().min(0).max(1000).default(120),
  RAG_MATCH_COUNT: z.coerce.number().int().min(1).max(50).default(5),
  RAG_MIN_SIMILARITY: z.coerce.number().min(-1).max(1).default(0.35),
  RAG_INDEX_VERSION: z.coerce.number().int().positive().default(1),
}).superRefine((config, context) => {
  if (config.RAG_CHUNK_OVERLAP >= config.RAG_CHUNK_SIZE) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['RAG_CHUNK_OVERLAP'],
      message: 'RAG_CHUNK_OVERLAP must be smaller than RAG_CHUNK_SIZE.',
    })
  }

  if (config.AI_PROVIDER === 'gemini' && !config.GEMINI_API_KEY) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['GEMINI_API_KEY'],
      message: 'GEMINI_API_KEY is required when AI_PROVIDER is gemini.',
    })
  }
})

export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source)

  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid environment variables: ${names}`)
  }

  return result.data
}
