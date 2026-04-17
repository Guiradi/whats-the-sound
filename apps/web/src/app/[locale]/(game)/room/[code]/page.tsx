'use client';

import { GameBoard } from '@/components/game/game-board';
import { GameResults } from '@/components/game/game-results';
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
  const {
    snapshot,
    chat,
    isConnecting,
    error,
    isHost,
    myId,
    phaseStart,
    roundReveal,
    startGame,
    leaveRoom,
    sendChat,
  } = useRoom(code);

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

  // Active game phases + round transitions
  if (
    status === GameStatus.ROUND_START ||
    status === GameStatus.PHASE_1 ||
    status === GameStatus.PHASE_2 ||
    status === GameStatus.PHASE_3 ||
    status === GameStatus.PHASE_4 ||
    status === GameStatus.ROUND_END
  ) {
    return (
      <GameBoard
        snapshot={snapshot}
        chat={chat}
        myId={myId}
        phaseStart={phaseStart}
        roundReveal={roundReveal}
        onSendChat={sendChat}
      />
    );
  }

  // Game end — results screen
  if (status === GameStatus.GAME_END) {
    return <GameResults snapshot={snapshot} isHost={isHost} onPlayAgain={startGame} />;
  }

  return null;
}
