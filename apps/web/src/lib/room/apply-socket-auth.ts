'use client';

import type { GuestSession } from '@/lib/auth/guest';
import { setSocketAuth } from '@/lib/socket';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { User } from '@supabase/supabase-js';

export async function applySocketAuth(
  user: User | null,
  guest: GuestSession | null,
): Promise<void> {
  if (user) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    setSocketAuth(data.session?.access_token ?? null);
    return;
  }
  setSocketAuth(null, guest?.id);
}
