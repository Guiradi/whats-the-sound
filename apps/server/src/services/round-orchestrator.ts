import { GameStatus } from '@wts/shared';
import type { TypedServer } from '../socket/index.js';
import type { ServerRoomState, ServerRoundState } from '../types/room.js';
import type { AchievementService } from './achievement-service.js';
import { broadcastBotEvent } from './bot-broadcaster.js';
import type { MultiplayerXpAwarder } from './multiplayer-xp-awarder.js';
import type { PhaseClipManager } from './phase-clip-manager.js';
import type { ReferralService } from './referral-service.js';
import * as roomManager from './room-manager.js';

const ROUND_START_COUNTDOWN_MS = 3000;
const ROUND_END_DISPLAY_MS = 12000;

type Phase = 1 | 2 | 3 | 4;

const PHASE_STATUS: Record<Phase, GameStatus> = {
  1: GameStatus.PHASE_1,
  2: GameStatus.PHASE_2,
  3: GameStatus.PHASE_3,
  4: GameStatus.PHASE_4,
};

export function broadcastRoomState(io: TypedServer, room: ServerRoomState): void {
  io.to(`room:${room.code}`).emit('room:state', roomManager.toSnapshot(room));
}

export function clearRoundTimers(round: ServerRoundState): void {
  if (round.phaseTimer) {
    clearTimeout(round.phaseTimer);
    round.phaseTimer = null;
  }
  if (round.tickInterval) {
    clearInterval(round.tickInterval);
    round.tickInterval = null;
  }
}

export function connectedPlayerCount(room: ServerRoomState): number {
  let count = 0;
  for (const p of room.players.values()) {
    if (p.connected) count++;
  }
  return count;
}

interface RoundOrchestratorDeps {
  io: TypedServer;
  xpAwarder: MultiplayerXpAwarder;
  phaseClipManager: PhaseClipManager;
  referralService?: ReferralService;
  achievementService?: AchievementService;
}

export function createRoundOrchestrator(deps: RoundOrchestratorDeps) {
  const { io, xpAwarder, phaseClipManager, referralService, achievementService } = deps;

  function startRound(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const midi = room.playlist[room.currentRoundIndex];
    if (!midi) {
      endGame(roomCode);
      return;
    }

    room.status = GameStatus.ROUND_START;
    const newRound: ServerRoundState = {
      current: room.currentRoundIndex + 1,
      total: room.playlist.length,
      midi,
      phase: null,
      phaseStartAt: 0,
      phaseEndAt: 0,
      correctAnswers: [],
      artistMatchAnswers: [],
      phaseTimer: null,
      tickInterval: null,
      phaseClipPaths: null,
    };
    room.round = newRound;
    room.version++;

    broadcastBotEvent(io, roomCode, 'roundStart', {
      current: room.round.current,
      total: room.round.total,
    });

    broadcastRoomState(io, room);

    // Pre-clip and upload all 4 phases in parallel with the countdown so phase 1
    // sees clips ready. If prep fails, startPhase logs and aborts the round.
    void (async () => {
      const paths = await phaseClipManager.prepareForRound(midi);
      const currentRoom = roomManager.getRoom(roomCode);
      // Guard against the round being cancelled or replaced while we awaited.
      if (currentRoom?.round !== newRound) {
        if (paths) {
          phaseClipManager.cleanup(paths).catch(() => {});
        }
        return;
      }
      newRound.phaseClipPaths = paths;
    })();

    room.round.phaseTimer = setTimeout(() => {
      startPhase(roomCode, 1);
    }, ROUND_START_COUNTDOWN_MS);
  }

  function startPhase(roomCode: string, phase: Phase): void {
    const room = roomManager.getRoom(roomCode);
    if (!room?.round) return;

    const round = room.round;
    clearRoundTimers(round);

    // Per-phase signed URL takes a network round-trip; do it async without
    // blocking, then emit phase:start once ready.
    void emitPhaseStart(roomCode, phase, round, room);
  }

  async function emitPhaseStart(
    roomCode: string,
    phase: Phase,
    round: ServerRoundState,
    room: ServerRoomState,
  ): Promise<void> {
    // Wait for clip prep started by startRound. It runs in parallel with the
    // 3-second countdown so phase 1 typically sees clips already present.
    // Loop sleeps 200ms × 25 attempts = 5s ceiling.
    let attempts = 0;
    while (!round.phaseClipPaths && attempts < 25) {
      await sleep(200);
      const current = roomManager.getRoom(roomCode);
      if (current?.round !== round) return; // round was replaced/aborted
      attempts++;
    }

    const clipPath = round.phaseClipPaths?.[phase];
    if (!clipPath) {
      io.to(`room:${roomCode}`).emit('error:generic', {
        code: 'PHASE_PREP_FAILED',
        message: 'Could not prepare audio for this round.',
      });
      endRound(roomCode);
      return;
    }

    const signedUrl = await phaseClipManager.getSignedUrl(clipPath);
    if (!signedUrl) {
      io.to(`room:${roomCode}`).emit('error:generic', {
        code: 'PHASE_PREP_FAILED',
        message: 'Could not sign audio URL.',
      });
      endRound(roomCode);
      return;
    }

    const current = roomManager.getRoom(roomCode);
    if (current?.round !== round) return;

    room.status = PHASE_STATUS[phase];
    round.phase = phase;
    const now = Date.now();
    round.phaseStartAt = now;
    round.phaseEndAt = now + room.config.timePerPhaseSec * 1000;
    room.version++;

    const phaseKey = `phase${phase}` as keyof typeof round.midi.phases;
    const phaseConfig = round.midi.phases[phaseKey];

    io.to(`room:${roomCode}`).emit('phase:start', {
      phase,
      endsAt: round.phaseEndAt,
      audioData: phaseConfig,
      midiFileUrl: signedUrl,
      hints: {
        year: phase >= 2 ? (round.midi.year ?? null) : null,
        category: phase >= 3 ? round.midi.category : null,
      },
    });

    broadcastRoomState(io, room);

    // Timer ticks are computed client-side from phaseEndAt — no server-side rebroadcast loop.
    round.phaseTimer = setTimeout(() => {
      endPhase(roomCode);
    }, room.config.timePerPhaseSec * 1000);
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function endPhase(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room?.round) return;

    const round = room.round;
    clearRoundTimers(round);

    const currentPhase = round.phase;
    if (!currentPhase) return;

    if (currentPhase < 4) {
      startPhase(roomCode, (currentPhase + 1) as Phase);
    } else {
      endRound(roomCode);
    }
  }

  function endRound(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room?.round) return;

    const round = room.round;
    clearRoundTimers(round);

    room.status = GameStatus.ROUND_END;
    room.version++;

    io.to(`room:${roomCode}`).emit('round:reveal', {
      title: round.midi.title,
      artist: round.midi.artist,
      correctPlayerIds: round.correctAnswers.map((a) => a.playerId),
    });

    for (const player of room.players.values()) {
      if (!player.connected) continue;
      xpAwarder.awardRoundPlayed({
        playerId: player.id,
        gameSessionId: room.gameSessionId,
        roundIndex: room.currentRoundIndex,
        roomCode,
      });
    }

    broadcastRoomState(io, room);

    // Clean up the phase clips for this round (background, best-effort).
    const finishedRoundClips = round.phaseClipPaths;
    if (finishedRoundClips) {
      phaseClipManager.cleanup(finishedRoundClips).catch(() => {});
    }

    round.phaseTimer = setTimeout(() => {
      const currentRoom = roomManager.getRoom(roomCode);
      if (!currentRoom) return;

      currentRoom.currentRoundIndex++;
      if (currentRoom.currentRoundIndex < currentRoom.playlist.length) {
        startRound(roomCode);
      } else {
        endGame(roomCode);
      }
    }, ROUND_END_DISPLAY_MS);
  }

  function endGame(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    if (room.round) {
      clearRoundTimers(room.round);
      // Clean up any leftover phase clips (e.g., if game ends mid-round).
      const leftoverClips = room.round.phaseClipPaths;
      if (leftoverClips) {
        phaseClipManager.cleanup(leftoverClips).catch(() => {});
      }
    }

    room.status = GameStatus.GAME_END;
    room.round = null;
    room.version++;

    const ranking = Array.from(room.players.values())
      .filter((p) => p.connected)
      .sort((a, b) => b.totalScore - a.totalScore);

    ranking.forEach((player, idx) => {
      const position = idx + 1;
      xpAwarder.awardGameFinish({
        playerId: player.id,
        gameSessionId: room.gameSessionId,
        finalPosition: position,
        totalPlayers: ranking.length,
        roomCode,
      });
      xpAwarder.awardFirstMatchOfDay(player.id);

      if (referralService && !player.id.startsWith('guest:')) {
        setImmediate(() => {
          referralService.maybeRewardReferrer(player.id).catch(() => {});
        });
      }

      if (achievementService && !player.id.startsWith('guest:')) {
        const playerId = player.id;
        setImmediate(() => {
          achievementService
            .checkAchievements(playerId, 'multiplayer', {
              finalPosition: position,
              totalPlayers: ranking.length,
              roomCode,
            })
            .catch(() => {});
        });
      }
    });

    broadcastBotEvent(io, roomCode, 'gameOver');
    broadcastRoomState(io, room);
  }

  return { startRound, endRound };
}

export type RoundOrchestrator = ReturnType<typeof createRoundOrchestrator>;
