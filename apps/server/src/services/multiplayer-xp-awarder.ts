import { getTodayBRT } from '@wts/shared';
import {
  XP_FIRST_MATCH_OF_DAY,
  XP_MULTIPLAYER_CORRECT_DIVISOR,
  XP_MULTIPLAYER_FINISH_BASE,
  XP_MULTIPLAYER_PODIUM,
  XP_MULTIPLAYER_ROUND_PLAYED,
} from '@wts/shared/constants';
import type { XpService } from './xp-service.js';

type XpSource = Parameters<XpService['awardXp']>[0]['source'];

export function createMultiplayerXpAwarder(xpService: XpService | undefined) {
  function fireAndForget(
    userId: string,
    source: XpSource,
    sourceRef: string,
    amount: number,
    context: Record<string, unknown>,
  ): void {
    if (!xpService || !userId || userId.startsWith('guest:') || amount <= 0) return;
    setImmediate(() => {
      xpService.awardXp({ userId, source, sourceRef, amount, context }).catch(() => {});
    });
  }

  function awardCorrectGuess(params: {
    playerId: string;
    gameSessionId: string | null;
    roundIndex: number;
    score: number;
    phase: number;
    position: number;
    roomCode: string;
  }): void {
    const amount = Math.floor(params.score / XP_MULTIPLAYER_CORRECT_DIVISOR);
    fireAndForget(
      params.playerId,
      'multiplayer_correct',
      `mp_correct_${params.gameSessionId}_${params.roundIndex}_${params.playerId}`,
      amount,
      {
        phase: params.phase,
        position: params.position,
        roomCode: params.roomCode,
        score: params.score,
      },
    );
  }

  function awardRoundPlayed(params: {
    playerId: string;
    gameSessionId: string | null;
    roundIndex: number;
    roomCode: string;
  }): void {
    fireAndForget(
      params.playerId,
      'multiplayer_round_played',
      `mp_played_${params.gameSessionId}_${params.roundIndex}_${params.playerId}`,
      XP_MULTIPLAYER_ROUND_PLAYED,
      { roomCode: params.roomCode, roundIndex: params.roundIndex },
    );
  }

  function awardGameFinish(params: {
    playerId: string;
    gameSessionId: string | null;
    finalPosition: number;
    totalPlayers: number;
    roomCode: string;
  }): void {
    const podiumBonus = XP_MULTIPLAYER_PODIUM[params.finalPosition] ?? 0;
    const amount = XP_MULTIPLAYER_FINISH_BASE + podiumBonus;
    fireAndForget(
      params.playerId,
      'multiplayer_finish',
      `mp_finish_${params.gameSessionId}_${params.playerId}`,
      amount,
      {
        finalPosition: params.finalPosition,
        totalPlayers: params.totalPlayers,
        roomCode: params.roomCode,
      },
    );
  }

  function awardFirstMatchOfDay(userId: string): void {
    if (!xpService || !userId || userId.startsWith('guest:')) return;
    const dateISO = getTodayBRT();
    setImmediate(() => {
      xpService
        .awardXp({
          userId,
          source: 'first_match_of_day',
          sourceRef: `first_match_${dateISO}_${userId}`,
          amount: XP_FIRST_MATCH_OF_DAY,
          context: { date: dateISO, matchSource: 'mp' },
        })
        .catch(() => {});
    });
  }

  return {
    awardCorrectGuess,
    awardRoundPlayed,
    awardGameFinish,
    awardFirstMatchOfDay,
  };
}

export type MultiplayerXpAwarder = ReturnType<typeof createMultiplayerXpAwarder>;
