'use client';

import { env } from '@/env';
import { useEffect } from 'react';

const API_BASE = env.NEXT_PUBLIC_SERVER_URL;
const STORAGE_KEY = 'wts:touched-login-date';

function getTodayBRT(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Pings POST /api/me/touch-login once per BRT day per authenticated user, to award
 * daily_login + login_streak_bonus XP. Fires once per browser session as long as
 * the stored date is older than today. Silent on failure — XP is best-effort.
 */
export function useTouchLogin(userId: string | null): void {
  useEffect(() => {
    if (!userId) return;
    if (typeof window === 'undefined') return;

    const today = getTodayBRT();
    const last = sessionStorage.getItem(STORAGE_KEY);
    if (last === today) return;

    const controller = new AbortController();
    fetch(`${API_BASE}/api/me/touch-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      signal: controller.signal,
    })
      .then((res) => {
        if (res.ok) sessionStorage.setItem(STORAGE_KEY, today);
      })
      .catch(() => {
        // Best-effort; do not disturb the user.
      });

    return () => controller.abort();
  }, [userId]);
}
