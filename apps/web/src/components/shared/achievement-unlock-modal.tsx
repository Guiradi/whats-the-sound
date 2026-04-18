'use client';

import { AchievementBadge } from '@/components/shared/achievement-badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { AchievementUnlockedPayload } from '@wts/shared';
import { getAchievement } from '@wts/shared';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

interface AchievementUnlockModalProps {
  unlock: AchievementUnlockedPayload | null;
  onDismiss: () => void;
}

export function AchievementUnlockModal({ unlock, onDismiss }: AchievementUnlockModalProps) {
  const t = useTranslations('achievements');
  const tCatalog = useTranslations('achievements.catalog');

  useEffect(() => {
    if (!unlock) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [unlock, onDismiss]);

  const definition = unlock
    ? getAchievement(unlock.achievementId as Parameters<typeof getAchievement>[0])
    : undefined;

  let title = '';
  let description = '';
  if (unlock) {
    try {
      title = tCatalog(`${unlock.achievementId}.title`);
    } catch {
      title = unlock.achievementId;
    }
    try {
      description = tCatalog(`${unlock.achievementId}.description`);
    } catch {
      description = '';
    }
  }

  return (
    <Dialog open={!!unlock} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-sm text-center">
        <DialogTitle className="sr-only">{t('unlock.title')}</DialogTitle>
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-accent-magenta">
            {t('unlock.title')}
          </p>
          {unlock && definition && (
            <AchievementBadge
              iconName={definition.icon}
              tier={unlock.tier}
              unlocked
              size="lg"
              className="animate-[scale-pop_0.5s_ease-out]"
            />
          )}
          <h2 className="font-display text-2xl font-bold text-text-primary">{title}</h2>
          {description && <p className="text-sm text-text-secondary">{description}</p>}
          {unlock && unlock.xpReward > 0 && (
            <p className="text-sm text-accent-cyan">
              {t('unlock.xpAwarded', { amount: unlock.xpReward })}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
