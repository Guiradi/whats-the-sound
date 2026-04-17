import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // Dev escape hatch for /admin/* routes. Only respected when NODE_ENV !== 'production'.
    // Lets a dev navigate admin pages before seeding a real admin user.
    ALLOW_ADMIN_WITHOUT_ROLE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    NEXT_PUBLIC_SERVER_URL: z.string().url().default('http://localhost:3001'),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .startsWith('sb_publishable_', 'must be a Supabase publishable key (sb_publishable_*)'),
  },

  // Static references so Next.js/Webpack can inline these into the client bundle.
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
});

export type WebEnv = typeof env;
