import { env } from '@/env';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components. Holds the session in cookies so that
 * Server Components can read the same user via the server helper.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
