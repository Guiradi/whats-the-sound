'use client';

import { useEffect } from 'react';

export function HashDebugLogger() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.replace('#', ''));
    const parsed = Object.fromEntries(params.entries());
    console.error('[login] Hash fragment from Supabase:', parsed);
    console.error('[login] Full URL:', window.location.href);
  }, []);

  return null;
}
