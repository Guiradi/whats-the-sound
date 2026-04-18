'use client';

import { getSocket } from '@/lib/socket';
import type { AchievementUnlockedPayload } from '@wts/shared';
import { useEffect } from 'react';

interface AchievementNotificationsOptions {
  enabled: boolean;
  onUnlock: (payload: AchievementUnlockedPayload) => void;
}

/**
 * Subscribes to the server-emitted `achievement:unlocked` event and forwards it to
 * the queue so the unlock modal surfaces it. Only active when `enabled` is true.
 */
export function useAchievementNotifications({
  enabled,
  onUnlock,
}: AchievementNotificationsOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    const handleUnlocked = (payload: AchievementUnlockedPayload) => {
      onUnlock(payload);
    };

    socket.on('achievement:unlocked', handleUnlocked);

    return () => {
      socket.off('achievement:unlocked', handleUnlocked);
    };
  }, [enabled, onUnlock]);
}
