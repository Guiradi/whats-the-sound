import { env } from '@/env';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components. Holds the session in cookies so that
 * Server Components can read the same user via the server helper.
 *
 * Returns null when Supabase env vars are missing (e.g. during CI builds or
 * early local dev without .env). Callers must handle the null case.
 */
export function createSupabaseBrowserClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
