'use client';

import { PlayerListLobby } from '@/components/room/player-list-lobby';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MIN_PLAYERS_PER_ROOM } from '@wts/shared';
import type { RoomStateSnapshot } from '@wts/shared';
import { Copy, LogOut, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface RoomLobbyProps {
  snapshot: RoomStateSnapshot;
  isHost: boolean;
  onStartGame: () => void;
  onLeave: () => void;
}

export function RoomLobby({ snapshot, isHost, onStartGame, onLeave }: RoomLobbyProps) {
  const t = useTranslations('room');
  const [copied, setCopied] = useState(false);
  const canStart = isHost && snapshot.players.length >= MIN_PLAYERS_PER_ROOM;

  const copyLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success(t('lobby.copied'));
      setTimeout(() => setCopied(false), 2000);
    });
  }, [t]);

  const { config } = snapshot.room;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      {/* Room code header */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-text-muted">{t('lobby.roomCode')}</p>
        <p className="font-mono text-4xl font-bold tracking-widest text-accent-cyan">
          {snapshot.room.code}
        </p>
        <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1.5">
          <Copy className="h-4 w-4" />
          {copied ? t('lobby.copied') : t('lobby.copyLink')}
        </Button>
      </div>

      {/* Config summary */}
      <Card className="flex flex-wrap items-center justify-center gap-2 p-3">
        <Badge variant="cyan">{t(`categories.${config.category}`)}</Badge>
        <Badge variant="default">{t('lobby.configRounds', { count: config.maxRounds })}</Badge>
        <Badge variant="default">
          {t('lobby.configTime', { seconds: config.timePerPhaseSec })}
        </Badge>
        <Badge variant="default">{t('lobby.configPlayers', { max: config.maxPlayers })}</Badge>
      </Card>

      {/* Player list */}
      <PlayerListLobby players={snapshot.players} hostId={snapshot.room.hostId} />

      {/* Actions */}
      <div className="flex flex-col items-center gap-3">
        {isHost ? (
          <Button
            size="lg"
            onClick={onStartGame}
            disabled={!canStart}
            className="w-full max-w-xs gap-2"
          >
            <Play className="h-5 w-5" />
            {canStart ? t('lobby.start') : t('lobby.needMorePlayers')}
          </Button>
        ) : (
          <p className="text-sm text-text-muted">{t('lobby.waitingForHost')}</p>
        )}
        <Button variant="ghost" size="sm" onClick={onLeave} className="gap-1.5 text-text-muted">
          <LogOut className="h-4 w-4" />
          {t('lobby.leave')}
        </Button>
      </div>
    </div>
  );
}
