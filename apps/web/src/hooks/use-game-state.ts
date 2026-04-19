'use client';

import { GameStatus, isActivePhase } from '@wts/shared';
import type { RoomPlayer, RoomStateSnapshot } from '@wts/shared';
import { useEffect, useMemo, useState } from 'react';

type TimerColor = 'cyan' | 'yellow' | 'red';

interface GameState {
  status: string;
  phase: 1 | 2 | 3 | 4 | null;
  roundNumber: number;
  totalRounds: number;
  timeRemaining: number;
  timeTotal: number;
  timerProgress: number;
  timerColor: TimerColor;
  isPlaying: boolean;
  isRoundStart: boolean;
  isRoundEnd: boolean;
  isGameEnd: boolean;
  sortedPlayers: RoomPlayer[];
  myCorrect: boolean;
  correctPlayerIds: string[];
}

function getTimerColor(progress: number): TimerColor {
  if (progress > 0.5) return 'cyan';
  if (progress > 0.2) return 'yellow';
  return 'red';
}

export function useGameState(snapshot: RoomStateSnapshot | null, myId: string | null): GameState {
  const [timeRemaining, setTimeRemaining] = useState(0);

  const round = snapshot?.round ?? null;
  const status = snapshot?.room.status ?? GameStatus.LOBBY;
  const isPlaying = isActivePhase(status);
  const phaseEndAt = round?.phaseEndAt ?? 0;
  const phaseStartAt = round?.phaseStartAt ?? 0;
  const timeTotal = phaseEndAt > phaseStartAt ? (phaseEndAt - phaseStartAt) / 1000 : 0;

  useEffect(() => {
    if (!isPlaying || phaseEndAt === 0) {
      setTimeRemaining(0);
      return;
    }

    function tick() {
      const remaining = Math.max(0, (phaseEndAt - Date.now()) / 1000);
      setTimeRemaining(remaining);
    }

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [isPlaying, phaseEndAt]);

  const timerProgress = timeTotal > 0 ? timeRemaining / timeTotal : 0;
  const timerColor = getTimerColor(timerProgress);

  const sortedPlayers = useMemo(() => {
    if (!snapshot) return [];
    return [...snapshot.players].sort((a, b) => b.totalScore - a.totalScore);
  }, [snapshot]);

  const myCorrect = useMemo(() => {
    if (!round || !myId) return false;
    return round.correctPlayerIds.includes(myId);
  }, [round, myId]);

  return {
    status,
    phase: round?.phase ?? null,
    roundNumber: round?.current ?? 0,
    totalRounds: round?.total ?? 0,
    timeRemaining,
    timeTotal,
    timerProgress,
    timerColor,
    isPlaying,
    isRoundStart: status === GameStatus.ROUND_START,
    isRoundEnd: status === GameStatus.ROUND_END,
    isGameEnd: status === GameStatus.GAME_END,
    sortedPlayers,
    myCorrect,
    correctPlayerIds: round?.correctPlayerIds ?? [],
  };
}
