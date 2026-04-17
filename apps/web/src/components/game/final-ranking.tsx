'use client';

import { UserAvatar } from '@/components/auth/user-avatar';
import type { RoomPlayer } from '@wts/shared';
import { useTranslations } from 'next-intl';

interface FinalRankingProps {
  players: RoomPlayer[];
}

export function FinalRanking({ players }: FinalRankingProps) {
  const t = useTranslations('game.results');

  return (
    <div className="w-full max-w-md">
      <div className="mb-2 grid grid-cols-[2rem_2rem_1fr_4rem_3rem] gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        <span>{t('rank')}</span>
        <span />
        <span />
        <span className="text-right">{t('score')}</span>
        <span className="text-right">{t('correct')}</span>
      </div>
      {players.map((player, i) => (
        <div
          key={player.id}
          className="grid grid-cols-[2rem_2rem_1fr_4rem_3rem] items-center gap-2 rounded-md px-2 py-1.5 text-sm odd:bg-bg-surface-hover"
        >
          <span className="font-mono font-bold text-text-muted">{i + 1}</span>
          <UserAvatar nickname={player.nickname} src={player.avatar} size="sm" />
          <span className="truncate font-medium text-text-primary">{player.nickname}</span>
          <span className="text-right font-mono font-bold text-accent-yellow tabular-nums">
            {player.totalScore}
          </span>
          <span className="text-right font-mono text-text-secondary tabular-nums">
            {player.correctCount}
          </span>
        </div>
      ))}
    </div>
  );
}
