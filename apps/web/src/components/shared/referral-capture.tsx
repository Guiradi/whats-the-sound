'use client';

import { useAuth } from '@/hooks/use-auth';
import { authFetch } from '@/lib/api-client';
import { useEffect } from 'react';

const STORAGE_KEY = 'wts:pending-referral';
const REFERRAL_PARAM = 'ref';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface StoredReferral {
  code: string;
  capturedAt: number;
}

function captureFromUrl(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get(REFERRAL_PARAM);
  if (!ref) return;

  const sanitized = ref.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,10}$/.test(sanitized)) return;

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing) as StoredReferral;
      if (Date.now() - parsed.capturedAt < TTL_MS) return; // keep first referral wins
    }
    const payload: StoredReferral = { code: sanitized, capturedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage may be blocked (private mode); silently ignore.
  }
}

function loadPending(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReferral;
    if (Date.now() - parsed.capturedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

function clearPending(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Captures `?ref=XXX` from the URL into localStorage on first load, then applies any
 * pending referral once the user authenticates (post-OAuth). Runs once per mount.
 */
export function ReferralCapture(): null {
  const { user, isGuest } = useAuth();

  // Capture ?ref= on every mount (cheap, idempotent via TTL check).
  useEffect(() => {
    captureFromUrl();
  }, []);

  // Apply pending referral when a real (non-guest) user is available.
  useEffect(() => {
    if (!user || isGuest) return;
    const code = loadPending();
    if (!code) return;

    const controller = new AbortController();
    authFetch('/api/me/apply-referral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then(() => {
        // Clear regardless of outcome (already_referred / invalid_code / applied) —
        // the user shouldn't keep retrying the same pending code on every render.
        clearPending();
      })
      .catch(() => {
        // Network failure — leave the pending code so we retry next session.
      });

    return () => controller.abort();
  }, [user, isGuest]);

  return null;
}
