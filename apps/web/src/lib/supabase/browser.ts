import { env } from '@/env';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Supabase client for Client Components. Holds the session in cookies so that
 * Server Components can read the same user via the server helper.
 *
 * Returned as a singleton so every caller (AuthProvider, authFetch, socket auth,
 * notification bridges) shares the same session state — avoiding races where a
 * freshly-created client's session hasn't finished restoring from cookies yet.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;
  cached = createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return cached;
}
