import { UserAvatar } from '@/components/auth/user-avatar';
import { LevelBadge } from '@/components/shared/level-badge';
import { xpForLevel } from '@wts/shared/constants';
import { Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface WelcomeBlockProps {
  nickname: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  loginStreak: number;
}

export function WelcomeBlock({ nickname, avatarUrl, level, xp, loginStreak }: WelcomeBlockProps) {
  const t = useTranslations('home.dashboard.welcome');

  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const intoLevel = Math.max(0, xp - currentLevelXp);
  const progressPct = Math.min(100, Math.round((intoLevel / span) * 100));

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-bg-border bg-bg-surface p-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-3">
        <UserAvatar nickname={nickname} src={avatarUrl ?? undefined} size="md" />
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-text-muted">{t('greeting')}</span>
          <span className="font-display text-xl font-semibold text-text-primary">{nickname}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <LevelBadge level={level} size="md" />
          <span className="font-mono text-xs text-text-muted tabular-nums">
            {t('xpProgress', { current: intoLevel, span })}
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-bg-base"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('xpBarLabel', { level: level + 1 })}
          tabIndex={0}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-magenta transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {loginStreak > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-bg-border bg-bg-base px-3 py-2">
          <Flame className="h-4 w-4 text-accent-orange" aria-hidden="true" />
          <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">
            {t('loginStreak', { count: loginStreak })}
          </span>
        </div>
      )}
    </section>
  );
}
