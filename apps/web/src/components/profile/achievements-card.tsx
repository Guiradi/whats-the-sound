'use client';

import { AchievementBadge } from '@/components/shared/achievement-badge';
import { env } from '@/env';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { AchievementDefinition } from '@wts/shared';
import { Medal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface AchievementsResponse {
  catalog: readonly AchievementDefinition[];
  unlocked: { achievementId: string; unlockedAt: string }[];
}

export function AchievementsCard() {
  const t = useTranslations('achievements.card');
  const tCatalog = useTranslations('achievements.catalog');
  const { user, isGuest } = useAuth();
  const [data, setData] = useState<AchievementsResponse | null>(null);

  useEffect(() => {
    if (!user || isGuest) return;
    let cancelled = false;
    fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/me/achievements`, {
      headers: { 'x-user-id': user.id },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body) setData(body as AchievementsResponse);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, isGuest]);

  if (!user || isGuest) return null;

  const unlockedIds = new Set((data?.unlocked ?? []).map((u) => u.achievementId));
  const catalog = data?.catalog ?? [];
  const unlockedCount = catalog.filter((a) => unlockedIds.has(a.id)).length;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-bg-border bg-bg-surface p-6">
      <header className="flex items-start gap-3">
        <Medal className="h-5 w-5 shrink-0 text-accent-yellow" aria-hidden="true" />
        <div className="flex flex-col">
          <h2 className="font-display text-lg font-semibold text-text-primary">{t('title')}</h2>
          <p className="text-sm text-text-muted">{t('description')}</p>
        </div>
      </header>

      <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
        {t('progress', { unlocked: unlockedCount, total: catalog.length })}
      </p>

      <ul className="grid grid-cols-4 gap-4 sm:grid-cols-8">
        {catalog.map((achievement) => {
          const unlocked = unlockedIds.has(achievement.id);
          let title = achievement.id;
          let description = '';
          try {
            title = tCatalog(`${achievement.id}.title`);
          } catch {
            // fallback to id
          }
          try {
            description = tCatalog(`${achievement.id}.description`);
          } catch {
            // no-op
          }

          return (
            <li
              key={achievement.id}
              className="flex flex-col items-center gap-1.5 text-center"
              title={description || title}
            >
              <AchievementBadge
                iconName={achievement.icon}
                tier={achievement.tier}
                unlocked={unlocked}
                size="md"
              />
              <span
                className={cn(
                  'line-clamp-2 text-xs',
                  unlocked ? 'text-text-primary' : 'text-text-muted',
                )}
              >
                {title}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
