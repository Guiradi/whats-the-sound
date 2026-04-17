import { env } from '@/env';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components. Holds the session in cookies so that
 * Server Components can read the same user via the server helper.
 *
 * Throws at call time if Supabase env vars are missing — callers should only
 * invoke this from contexts that require an authenticated experience.
 */
export function createSupabaseBrowserClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and _PUBLISHABLE_KEY');
  }
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
