'use client';

import { LevelUpModal } from '@/components/shared/level-up-modal';
import { useAuth } from '@/hooks/use-auth';
import { useLevelUp } from '@/hooks/use-level-up';
import { useXpNotifications } from '@/hooks/use-xp-notifications';
import { getSocket, setSocketAuth } from '@/lib/socket';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useEffect } from 'react';

/**
 * Bridges server-emitted XP events to the UI: Sonner toasts for xp:awarded, queued
 * LevelUpModal for xp:level_up. Mount once inside AuthProvider.
 *
 * Ensures the socket is connected for authenticated users even outside of a game room,
 * so XP gained via daily/login also surfaces as a toast in real time. The socket is
 * shared (idempotent connect), so useRoom() and useDaily() continue to work.
 */
export function XpNotificationBridge() {
  const { user, isGuest } = useAuth();
  const enabled = !!user && !isGuest;
  const { current, enqueue, dismiss } = useLevelUp();

  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;

    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSocketAuth(data.session?.access_token ?? null);
      const socket = getSocket();
      if (!socket.connected) socket.connect();
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, user]);

  useXpNotifications({ enabled, onLevelUp: enqueue });

  return <LevelUpModal levelUp={current} onDismiss={dismiss} />;
}
