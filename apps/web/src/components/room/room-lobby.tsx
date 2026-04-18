'use client';

import { AudioUnlockBanner } from '@/components/audio/audio-unlock-banner';
import { PlayerListLobby } from '@/components/room/player-list-lobby';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MIN_PLAYERS_PER_ROOM } from '@wts/shared';
import type { RoomStateSnapshot } from '@wts/shared';
import { Copy, LogOut, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface RoomLobbyProps {
  snapshot: RoomStateSnapshot;
  isHost: boolean;
  myId: string | null;
  onToggleReady: (ready: boolean) => void;
  onStartGame: () => void;
  onLeave: () => void;
}

export function RoomLobby({
  snapshot,
  isHost,
  myId,
  onToggleReady,
  onStartGame,
  onLeave,
}: RoomLobbyProps) {
  const t = useTranslations('room');
  const [copied, setCopied] = useState(false);

  const myPlayer = useMemo(
    () => snapshot.players.find((p) => p.id === myId) ?? null,
    [snapshot.players, myId],
  );

  const readyCount = useMemo(
    () => snapshot.players.filter((p) => p.isReady).length,
    [snapshot.players],
  );

  const allReady =
    readyCount === snapshot.players.length && snapshot.players.length >= MIN_PLAYERS_PER_ROOM;
  const enoughPlayers = snapshot.players.length >= MIN_PLAYERS_PER_ROOM;
  const canStart = isHost && enoughPlayers;

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
      <PlayerListLobby players={snapshot.players} hostId={snapshot.room.hostId} myId={myId} />

      {/* Audio unlock — lets players unlock AudioContext before the game starts */}
      <AudioUnlockBanner />

      {/* Ready toggle */}
      {myPlayer && (
        <div className="flex justify-center">
          {myPlayer.isReady ? (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onToggleReady(false)}
              className="w-full max-w-xs"
            >
              {t('lobby.cancelReady')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={() => onToggleReady(true)}
              className="w-full max-w-xs"
            >
              {t('lobby.ready')}
            </Button>
          )}
        </div>
      )}

      {/* Ready count */}
      <p className="text-center text-sm text-text-muted">
        {t('lobby.readyCount', { ready: readyCount, total: snapshot.players.length })}
      </p>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3">
        {isHost ? (
          <Button
            size="lg"
            onClick={onStartGame}
            disabled={!canStart || !allReady}
            className="w-full max-w-xs gap-2"
          >
            <Play className="h-5 w-5" />
            {!enoughPlayers
              ? t('lobby.needMorePlayers')
              : !allReady
                ? t('lobby.waitingReady')
                : t('lobby.start')}
          </Button>
        ) : (
          <p className="text-sm text-text-muted">
            {allReady ? t('lobby.waitingForHost') : t('lobby.waitingReady')}
          </p>
        )}
        <Button variant="ghost" size="sm" onClick={onLeave} className="gap-1.5 text-text-muted">
          <LogOut className="h-4 w-4" />
          {t('lobby.leave')}
        </Button>
      </div>
    </div>
  );
}
