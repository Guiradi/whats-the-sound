import { defineEnv } from '@wts/shared/env';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SERVER_URL: z.string().url().default('http://localhost:3001'),

  // Required from TASK-002 onwards. New Supabase API key format: publishable key
  // (sb_publishable_*) is safe to expose to the browser.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .startsWith('sb_publishable_', 'must be a Supabase publishable key (sb_publishable_*)'),

  // Dev escape hatch for /admin/* routes. Only respected when NODE_ENV !== 'production'.
  // Lets a dev navigate admin pages before seeding a real admin user.
  ALLOW_ADMIN_WITHOUT_ROLE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export const env = defineEnv(schema, { context: '@wts/web' });
export type WebEnv = typeof env;
