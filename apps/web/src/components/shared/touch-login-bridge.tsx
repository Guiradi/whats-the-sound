'use client';

import { useAuth } from '@/hooks/use-auth';
import { useTouchLogin } from '@/hooks/use-touch-login';

/**
 * Headless bridge component: calls useTouchLogin with the currently authenticated user.
 * Mount once near the root inside AuthProvider. No UI — just fires the daily login ping.
 */
export function TouchLoginBridge(): null {
  const { user } = useAuth();
  useTouchLogin(user?.id ?? null);
  return null;
}
