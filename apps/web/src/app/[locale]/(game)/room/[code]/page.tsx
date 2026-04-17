'use client';

import { RoomLobby } from '@/components/room/room-lobby';
import { useRoom } from '@/hooks/use-room';
import { useRouter } from '@/i18n/navigation';
import { GameStatus } from '@wts/shared';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { use, useCallback } from 'react';

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const t = useTranslations('room');
  const router = useRouter();
  const { snapshot, isConnecting, error, isHost, startGame, leaveRoom } = useRoom(code);

  const handleLeave = useCallback(() => {
    leaveRoom();
    router.push('/rooms');
  }, [leaveRoom, router]);

  // Loading state
  if (isConnecting || !snapshot) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
        <p className="text-sm text-text-muted">{t('connecting')}</p>
      </div>
    );
  }

  // Error state
  if (error && !snapshot) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-accent-red">{error}</p>
      </div>
    );
  }

  const { status } = snapshot.room;

  // Lobby
  if (status === GameStatus.LOBBY) {
    return (
      <RoomLobby
        snapshot={snapshot}
        isHost={isHost}
        onStartGame={startGame}
        onLeave={handleLeave}
      />
    );
  }

  // Game phases — placeholder for TASK-013
  if (
    status === GameStatus.ROUND_START ||
    status === GameStatus.PHASE_1 ||
    status === GameStatus.PHASE_2 ||
    status === GameStatus.PHASE_3 ||
    status === GameStatus.PHASE_4 ||
    status === GameStatus.ROUND_END
  ) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-lg font-bold text-accent-cyan">{t('gameInProgress')}</p>
        <p className="text-sm text-text-muted">{t('gameStatus', { status })}</p>
      </div>
    );
  }

  // Game end — placeholder for TASK-014
  if (status === GameStatus.GAME_END) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-lg font-bold text-accent-yellow">{t('gameOver')}</p>
      </div>
    );
  }

  return null;
}
