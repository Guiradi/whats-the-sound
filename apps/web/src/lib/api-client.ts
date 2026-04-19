'use client';

import { env } from '@/env';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

async function currentAccessToken(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await currentAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${env.NEXT_PUBLIC_SERVER_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  });
}
