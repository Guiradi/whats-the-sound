import { defineEnv } from '@wts/shared/env';
import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    HOST: z.string().min(1).default('0.0.0.0'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),

  // Required from TASK-002 onwards. New Supabase API key format:
  // - secret key (sb_secret_*) replaces the legacy service_role JWT; server-only.
  // - DATABASE_URL is the Session Pooler connection string (port 5432) with the project password.
  SUPABASE_URL: z.string().url().optional(),
  // Accepts both the new cloud format (sb_secret_*) and local JWT service_role keys
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().url().optional(),

    // Optional in Sprint 1; required from TASK-015 onwards (daily backend)
    DAILY_SEED: z.string().min(8).optional(),
  })
  // Reject wildcard CORS in production: combined with credentials: true on
  // the Fastify CORS plugin this would broadcast Supabase cookies to every
  // origin. Local dev still allows `*` if a developer ever sets it.
  .refine(
    (env) => env.NODE_ENV !== 'production' || !env.CORS_ORIGINS.includes('*'),
    { message: 'CORS_ORIGINS=* is not allowed in production', path: ['CORS_ORIGINS'] },
  );

export const env = defineEnv(schema, { context: '@wts/server' });
export type ServerEnv = typeof env;
