import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { env } from '../env.js';

let cachedClient: SupabaseClient | null = null;

/**
 * Server-side admin client. Uses the secret key (bypasses RLS) — never expose to the browser.
 * Cached as a singleton per process.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error('Missing Supabase env vars: SUPABASE_URL and SUPABASE_SECRET_KEY');
  }
  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
