'use client';

import { UserAvatar } from '@/components/auth/user-avatar';
import { cn } from '@/lib/utils';
import type { RoomPlayer } from '@wts/shared';
import { Check, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PlayerListProps {
  players: RoomPlayer[];
  correctPlayerIds: string[];
  myId: string | null;
}

export function PlayerList({ players, correctPlayerIds, myId }: PlayerListProps) {
  const t = useTranslations('game');
  const correctSet = new Set(correctPlayerIds);

  return (
    <div className="flex flex-col gap-1">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {t('players.title')}
      </h3>
      {players.map((player, i) => (
        <div
          key={player.id}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
            player.id === myId && 'bg-bg-surface-hover',
            !player.connected && 'opacity-50',
          )}
        >
          <span className="w-5 text-center text-xs font-bold text-text-muted">{i + 1}</span>
          <UserAvatar nickname={player.nickname} src={player.avatar} size="sm" />
          <span className="flex-1 truncate font-medium">{player.nickname}</span>
          {correctSet.has(player.id) && <Check className="h-4 w-4 text-accent-green" />}
          {!player.connected && <WifiOff className="h-3.5 w-3.5 text-accent-red" />}
          <span className="min-w-[4ch] text-right font-mono text-xs font-bold text-accent-yellow tabular-nums">
            {player.totalScore}
          </span>
        </div>
      ))}
    </div>
  );
}
