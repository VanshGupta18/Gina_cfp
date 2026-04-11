import 'dotenv/config';
import { z } from 'zod';

const boolFromEnv = z
  .string()
  .optional()
  .transform((v) => v === undefined || v === '' ? false : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase()));

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  AWS_REGION: z.string().min(1),

  SQLCODER_EC2_URL: z.string().url(),
  SQLCODER_EC2_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),

  HF_API_KEY_1: z.string().min(1),
  HF_API_KEY_2: z.string().default(''),
  SQLCODER_HF_MODEL: z.string().min(1),
  EMBEDDING_HF_MODEL: z.string().min(1),

  GROQ_API_KEY_1: z.string().min(1),
  GROQ_API_KEY_2: z.string().default(''),
  GROQ_API_KEY_3: z.string().default(''),
  GROQ_MODEL_PLANNER: z.string().min(1),
  GROQ_MODEL_NARRATOR: z.string().min(1),
  GROQ_MODEL_SQL_FALLBACK: z.string().min(1),

  GEMINI_API_KEY_1: z.string().min(1),
  GEMINI_API_KEY_2: z.string().default(''),
  GEMINI_MODEL: z.string().min(1),

  USE_GEMINI_NARRATOR: boolFromEnv,
  SNAPSHOT_MODE: boolFromEnv,
  SQL_FALLBACK_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  SECONDARY_QUERY_DELTA_THRESHOLD: z.coerce.number().positive().default(0.05),

  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
