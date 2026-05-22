import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { env } from '../env.js';

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Server-side admin client. Uses the secret key (bypasses RLS) — never expose to the browser.
 * Cached as a singleton per process.
 *
 * Reserve this for system tasks (cron, achievements awarder, score writes) where
 * RLS would otherwise block the operation. For reads acting on behalf of a user,
 * prefer `createSupabaseUserClient` so RLS is a second-line defense behind the
 * manual `.eq('user_id', ...)` filters.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error('Missing Supabase env vars: SUPABASE_URL and SUPABASE_SECRET_KEY');
  }
  cachedAdminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdminClient;
}

/**
 * Per-request supabase client scoped to the caller's JWT. PostgREST calls
 * execute under the user's role + auth.uid(), so any RLS policy filtered on
 * user identity (e.g. `using (auth.uid() = user_id)`) is enforced — a missing
 * `.eq('user_id', userId)` in the route handler no longer means cross-user
 * data exposure.
 *
 * Returns null when the server is not configured with the anon key (e.g. local
 * dev without SUPABASE_ANON_KEY set); callers should fall back to admin reads
 * with explicit filtering in that case.
 */
export function createSupabaseUserClient(userJwt: string): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${userJwt}` },
    },
  });
}
