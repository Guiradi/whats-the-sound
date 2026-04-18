'use client';

import type { AchievementUnlockedPayload } from '@wts/shared';
import { useCallback, useState } from 'react';

/**
 * Queue for achievement unlock notifications. Mirrors use-level-up so back-to-back
 * unlocks show one at a time instead of stacking dialogs.
 */
export function useAchievementUnlock() {
  const [queue, setQueue] = useState<AchievementUnlockedPayload[]>([]);

  const enqueue = useCallback((payload: AchievementUnlockedPayload) => {
    setQueue((prev) => [...prev, payload]);
  }, []);

  const dismiss = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const current = queue[0] ?? null;

  return { current, enqueue, dismiss };
}
