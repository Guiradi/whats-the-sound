'use client';

import { UserAvatar } from '@/components/auth/user-avatar';
import { Badge } from '@/components/ui/badge';
import type { RoomPlayer } from '@wts/shared';
import { Crown, Wifi, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PlayerListLobbyProps {
  players: RoomPlayer[];
  hostId: string;
}

export function PlayerListLobby({ players, hostId }: PlayerListLobbyProps) {
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
            className="flex items-center gap-3 rounded-md bg-bg-surface-hover px-3 py-2"
          >
            <UserAvatar nickname={player.nickname} src={player.avatar} size="sm" />
            <span className="flex-1 truncate text-sm font-medium text-text-primary">
              {player.nickname}
            </span>
            {player.id === hostId && <Crown className="h-4 w-4 text-accent-yellow" />}
            {player.isGuest && <Badge variant="default">{t('lobby.guest')}</Badge>}
            {player.connected ? (
              <Wifi className="h-3.5 w-3.5 text-accent-green" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-accent-red" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
