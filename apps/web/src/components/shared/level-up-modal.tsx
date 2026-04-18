'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { XpLevelUpPayload } from '@wts/shared';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

interface LevelUpModalProps {
  levelUp: XpLevelUpPayload | null;
  onDismiss: () => void;
}

export function LevelUpModal({ levelUp, onDismiss }: LevelUpModalProps) {
  const t = useTranslations('xp.levelUp');

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!levelUp) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [levelUp, onDismiss]);

  return (
    <Dialog open={!!levelUp} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-xs text-center">
        <DialogTitle className="sr-only">{t('title')}</DialogTitle>
        <div className="flex flex-col items-center gap-4 py-4">
          <Sparkles className="h-12 w-12 animate-[scale-pop_0.5s_ease-out] text-accent-yellow" />
          <h2 className="font-display text-2xl font-bold text-accent-yellow">{t('title')}</h2>
          {levelUp && (
            <>
              <p className="text-lg font-bold text-text-primary">
                {t('message', {
                  previous: levelUp.previousLevel,
                  next: levelUp.newLevel,
                })}
              </p>
              <p className="text-sm text-accent-cyan">
                {t('xpGained', { amount: levelUp.xpGained })}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
