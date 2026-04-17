'use client';

import { UserAvatar } from '@/components/auth/user-avatar';
import { cn } from '@/lib/utils';
import type { RoomPlayer } from '@wts/shared';
import { useTranslations } from 'next-intl';

interface PodiumProps {
  players: RoomPlayer[];
}

const PODIUM_CONFIG = [
  {
    position: 1,
    height: 'h-32',
    color: 'border-accent-yellow shadow-[var(--shadow-glow-yellow)]',
    labelKey: 'ordinal.1',
    delay: 'animate-delay-500',
  },
  {
    position: 2,
    height: 'h-24',
    color: 'border-text-muted',
    labelKey: 'ordinal.2',
    delay: 'animate-delay-200',
  },
  {
    position: 3,
    height: 'h-20',
    color: 'border-accent-orange',
    labelKey: 'ordinal.3',
    delay: 'animate-delay-300',
  },
] as const;

// Display order: 2nd, 1st, 3rd
const DISPLAY_ORDER = [1, 0, 2] as const;

export function Podium({ players }: PodiumProps) {
  const t = useTranslations('game.results');
  const top3 = players.slice(0, 3);

  return (
    <div className="flex items-end justify-center gap-4">
      {DISPLAY_ORDER.map((idx) => {
        const player = top3[idx];
        const config = PODIUM_CONFIG[idx];
        if (!player || !config) return null;

        return (
          <div
            key={player.id}
            className="flex animate-[slide-up_0.5s_ease-out_both] flex-col items-center"
            style={{ animationDelay: `${(idx + 1) * 200}ms` }}
          >
            <UserAvatar
              nickname={player.nickname}
              src={player.avatar}
              size={config.position === 1 ? 'lg' : 'md'}
            />
            <span className="mt-1 text-sm font-semibold text-text-primary">{player.nickname}</span>
            <span className="text-xs font-bold text-accent-yellow tabular-nums">
              {player.totalScore}
            </span>
            <div
              className={cn(
                'mt-2 flex w-20 items-center justify-center rounded-t-md border-t-2 bg-bg-surface',
                config.height,
                config.color,
              )}
            >
              <span className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-text-muted">
                {t(config.labelKey)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
