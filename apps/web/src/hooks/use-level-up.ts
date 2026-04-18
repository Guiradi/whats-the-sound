'use client';

import type { XpLevelUpPayload } from '@wts/shared';
import { useCallback, useState } from 'react';

/**
 * Hook to manage level-up notifications.
 * Keeps a queue of level-ups and exposes current + dismiss.
 */
export function useLevelUp() {
  const [queue, setQueue] = useState<XpLevelUpPayload[]>([]);

  const enqueue = useCallback((payload: XpLevelUpPayload) => {
    setQueue((prev) => [...prev, payload]);
  }, []);

  const dismiss = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const current = queue[0] ?? null;

  return { current, enqueue, dismiss };
}
