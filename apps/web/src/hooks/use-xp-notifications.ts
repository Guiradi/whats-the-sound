'use client';

import { getSocket } from '@/lib/socket';
import type { XpAwardedPayload, XpLevelUpPayload } from '@wts/shared';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface XpNotificationsOptions {
  enabled: boolean;
  onLevelUp: (payload: XpLevelUpPayload) => void;
}

/**
 * Subscribes to server-emitted `xp:awarded` and `xp:level_up` events and fans them out
 * into a Sonner toast (+XP) and the level-up queue. Only active when `enabled` is true
 * (i.e. user is authenticated).
 */
export function useXpNotifications({ enabled, onLevelUp }: XpNotificationsOptions): void {
  const tSource = useTranslations('xp.source');
  const tToast = useTranslations('xp.toast');

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const handleAwarded = (payload: XpAwardedPayload) => {
      // `source` comes as an xp_source enum string; the key matches a translation key in xp.source.
      let sourceLabel: string;
      try {
        sourceLabel = tSource(payload.source);
      } catch {
        sourceLabel = payload.source;
      }
      toast.success(tToast('awarded', { amount: payload.amount, source: sourceLabel }));
    };

    const handleLevelUp = (payload: XpLevelUpPayload) => {
      onLevelUp(payload);
    };

    socket.on('xp:awarded', handleAwarded);
    socket.on('xp:level_up', handleLevelUp);

    return () => {
      socket.off('xp:awarded', handleAwarded);
      socket.off('xp:level_up', handleLevelUp);
    };
  }, [enabled, onLevelUp, tSource, tToast]);
}
