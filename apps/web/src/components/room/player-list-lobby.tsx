'use client';

import { UserAvatar } from '@/components/auth/user-avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RoomPlayer } from '@wts/shared';
import { Check, Crown, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PlayerListLobbyProps {
  players: RoomPlayer[];
  hostId: string;
  myId: string | null;
}

export function PlayerListLobby({ players, hostId, myId }: PlayerListLobbyProps) {
  const t = useTranslations('room');

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-text-secondary">
        {t('lobby.players', { count: players.length })}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {players.map((player) => (
          <li
            key={player.id}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
              player.id === myId ? 'bg-accent-cyan/10 ring-1 ring-accent-cyan/20' : 'bg-bg-surface-hover',
            )}
          >
            <UserAvatar nickname={player.nickname} src={player.avatar} size="sm" />
            <span className="flex-1 truncate text-sm font-medium text-text-primary">
              {player.nickname}
            </span>
            {player.id === hostId && <Crown className="h-4 w-4 text-accent-yellow" />}
            {player.isGuest && <Badge variant="default">{t('lobby.guest')}</Badge>}
            {!player.connected ? (
              <WifiOff className="h-3.5 w-3.5 text-accent-red" />
            ) : player.isReady ? (
              <Badge variant="green" className="gap-1">
                <Check className="h-3 w-3" />
                {t('lobby.readyBadge')}
              </Badge>
            ) : (
              <Badge variant="default">{t('lobby.notReadyBadge')}</Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
