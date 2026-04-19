'use client';

import { AchievementBadge } from '@/components/shared/achievement-badge';
import { useAuth } from '@/hooks/use-auth';
import { Link } from '@/i18n/navigation';
import { authFetch } from '@/lib/api-client';
import type { AchievementDefinition } from '@wts/shared';
import { Medal, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface AchievementsResponse {
  catalog: readonly AchievementDefinition[];
  unlocked: { achievementId: string; unlockedAt: string }[];
}

export function AchievementsCardCompact() {
  const t = useTranslations('home.dashboard.achievements');
  const { user, isGuest } = useAuth();
  const [data, setData] = useState<AchievementsResponse | null>(null);

  useEffect(() => {
    if (!user || isGuest) return;
    let cancelled = false;
    authFetch('/api/me/achievements')
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
    <Link
      href="/profile"
      className="group flex flex-col gap-4 rounded-2xl border border-bg-border bg-bg-surface p-6 transition-colors hover:border-accent-yellow/50"
    >
      <div className="flex items-start gap-3">
        <Medal className="mt-1 h-5 w-5 shrink-0 text-accent-yellow" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold text-text-primary">{t('title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {catalog.length > 0
              ? t('progress', { unlocked: unlockedCount, total: catalog.length })
              : t('loading')}
          </p>
        </div>
      </div>

      {catalog.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {catalog.map((achievement) => (
            <li key={achievement.id} className="flex justify-center">
              <AchievementBadge
                iconName={achievement.icon}
                tier={achievement.tier}
                unlocked={unlockedIds.has(achievement.id)}
                size="sm"
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-2 text-text-muted">
          <Trophy className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm">{t('loading')}</span>
        </div>
      )}
    </Link>
  );
}
