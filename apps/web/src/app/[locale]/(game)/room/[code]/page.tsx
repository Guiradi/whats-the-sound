'use client';

import { LoginModal } from '@/components/auth/login-modal';
import { GameBoard } from '@/components/game/game-board';
import { GameResults } from '@/components/game/game-results';
import { RoomLobby } from '@/components/room/room-lobby';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useRoom } from '@/hooks/use-room';
import { useRouter } from '@/i18n/navigation';
import { GameStatus } from '@wts/shared';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { use, useCallback, useState } from 'react';

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const t = useTranslations('room');
  const router = useRouter();
  const { user, guest, isLoading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const needsAuth = !authLoading && !user && !guest;
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

  // Auth guard: require login or guest session
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (needsAuth) {
    return (
      <>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <p className="text-sm text-text-muted">{t('loginRequired')}</p>
          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="text-sm font-medium text-accent-cyan hover:underline"
          >
            {t('loginAction')}
          </button>
        </div>
        <LoginModal open={showLogin} onOpenChange={setShowLogin} next={`/room/${code}`} />
      </>
    );
  }

  // Error state (check before loading to avoid infinite spinner on e.g. room not found)
  if (error && !snapshot) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-accent-red">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => router.push('/rooms')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          {t('backToRooms')}
        </Button>
      </div>
    );
  }

  // Loading state
  if (isConnecting || !snapshot) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
        <p className="text-sm text-text-muted">{t('connecting')}</p>
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
