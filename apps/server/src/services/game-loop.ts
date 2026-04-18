import { randomUUID } from 'node:crypto';
import {
  GameStatus,
  GuessResult,
  MIN_PLAYERS_PER_ROOM,
  calculateArtistScore,
  calculateTitleScore,
  resolveGuessPosition,
  verifyGuess,
} from '@wts/shared';
import type { ChatMessage } from '@wts/shared';
import {
  XP_FIRST_MATCH_OF_DAY,
  XP_MULTIPLAYER_CORRECT_DIVISOR,
  XP_MULTIPLAYER_FINISH_BASE,
  XP_MULTIPLAYER_PODIUM,
  XP_MULTIPLAYER_ROUND_PLAYED,
} from '@wts/shared/constants';
import type { TypedServer } from '../socket/index.js';
import type {
  ArtistMatchAnswer,
  CorrectAnswer,
  ServerRoomState,
  ServerRoundState,
} from '../types/room.js';
import type { MidiProvider } from './midi-provider.js';
import type { ReferralService } from './referral-service.js';
import * as roomManager from './room-manager.js';
import type { XpService } from './xp-service.js';

function getBRTToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const ROUND_START_COUNTDOWN_MS = 3000;
const ROUND_END_DISPLAY_MS = 12000;

type Phase = 1 | 2 | 3 | 4;

function phaseToStatus(phase: Phase): GameStatus {
  const map: Record<Phase, GameStatus> = {
    1: GameStatus.PHASE_1,
    2: GameStatus.PHASE_2,
    3: GameStatus.PHASE_3,
    4: GameStatus.PHASE_4,
  };
  return map[phase];
}

function makeBotMessage(text: string): ChatMessage {
  return {
    id: randomUUID(),
    authorId: 'bot',
    text,
    kind: 'bot',
    at: Date.now(),
  };
}

function broadcastState(io: TypedServer, room: ServerRoomState): void {
  io.to(`room:${room.code}`).emit('room:state', roomManager.toSnapshot(room));
}

function clearRoundTimers(round: ServerRoundState): void {
  if (round.phaseTimer) {
    clearTimeout(round.phaseTimer);
    round.phaseTimer = null;
  }
  if (round.tickInterval) {
    clearInterval(round.tickInterval);
    round.tickInterval = null;
  }
}

/** Count connected players who are participating in the game. */
function connectedPlayerCount(room: ServerRoomState): number {
  let count = 0;
  for (const p of room.players.values()) {
    if (p.connected) count++;
  }
  return count;
}

export interface GameLoop {
  startGame(roomCode: string, hostId: string): string | null;
  handleGuess(roomCode: string, playerId: string, guess: string): void;
  handleChat(roomCode: string, playerId: string, text: string): void;
}

export function createGameLoop(
  io: TypedServer,
  midiProvider: MidiProvider,
  xpService?: XpService,
  referralService?: ReferralService,
): GameLoop {
  /** Fire XP awards without blocking the game loop. Guests are filtered inside the service. */
  function awardXpAsync(
    userId: string,
    source: Parameters<XpService['awardXp']>[0]['source'],
    sourceRef: string,
    amount: number,
    context: Record<string, unknown>,
  ): void {
    if (!xpService || !userId || userId.startsWith('guest:') || amount <= 0) return;
    setImmediate(() => {
      xpService.awardXp({ userId, source, sourceRef, amount, context }).catch(() => {
        // Swallow — XP is best-effort and never blocks gameplay.
      });
    });
  }

  /** First MP/Daily completion of the day grants a one-off bonus; idempotent by date+user. */
  function awardFirstMatchOfDay(userId: string, matchSource: 'mp' | 'daily'): void {
    if (!xpService || !userId || userId.startsWith('guest:')) return;
    const dateISO = getBRTToday();
    setImmediate(() => {
      xpService
        .awardXp({
          userId,
          source: 'first_match_of_day',
          sourceRef: `first_match_${dateISO}_${userId}`,
          amount: XP_FIRST_MATCH_OF_DAY,
          context: { date: dateISO, matchSource },
        })
        .catch(() => {});
    });
  }

  // ─── Start Game ────────────────────────────────────────────

  function startGame(roomCode: string, hostId: string): string | null {
    const room = roomManager.getRoom(roomCode);
    if (!room) return 'ROOM_NOT_FOUND';

    if (room.hostId !== hostId) return 'NOT_HOST';
    if (room.status !== GameStatus.LOBBY && room.status !== GameStatus.GAME_END)
      return 'INVALID_STATE';
    if (connectedPlayerCount(room) < MIN_PLAYERS_PER_ROOM) return 'NOT_ENOUGH_PLAYERS';

    // Reset all player scores and ready states
    for (const player of room.players.values()) {
      player.totalScore = 0;
      player.correctCount = 0;
      player.isReady = false;
    }

    room.currentRoundIndex = 0;
    room.gameSessionId = randomUUID();
    room.version++;

    // Load MIDIs asynchronously then start rounds
    midiProvider
      .getMidis(room.config.category, room.config.maxRounds)
      .then((midis) => {
        const currentRoom = roomManager.getRoom(roomCode);
        if (!currentRoom) return;

        if (midis.length === 0) {
          const msg = makeBotMessage('bot.noSongsAvailable');
          roomManager.addChatMessage(roomCode, msg);
          io.to(`room:${roomCode}`).emit('chat:message', msg);
          currentRoom.status = GameStatus.LOBBY;
          currentRoom.version++;
          broadcastState(io, currentRoom);
          return;
        }

        room.playlist = midis;

        const msg = makeBotMessage(`bot.gameStarting:${JSON.stringify({ rounds: midis.length })}`);
        roomManager.addChatMessage(roomCode, msg);
        io.to(`room:${roomCode}`).emit('chat:message', msg);

        startRound(roomCode);
      })
      .catch(() => {
        // If MIDI loading fails, go back to lobby
        const currentRoom = roomManager.getRoom(roomCode);
        if (currentRoom) {
          currentRoom.status = GameStatus.LOBBY;
          currentRoom.version++;
          broadcastState(io, currentRoom);
        }
      });

    return null;
  }

  // ─── Start Round ───────────────────────────────────────────

  function startRound(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const midi = room.playlist[room.currentRoundIndex];
    if (!midi) {
      endGame(roomCode);
      return;
    }

    room.status = GameStatus.ROUND_START;
    room.round = {
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
    };
    room.version++;

    const msg = makeBotMessage(
      `bot.roundStart:${JSON.stringify({ current: room.round.current, total: room.round.total })}`,
    );
    roomManager.addChatMessage(roomCode, msg);
    io.to(`room:${roomCode}`).emit('chat:message', msg);

    broadcastState(io, room);

    // Countdown before starting phase 1
    room.round.phaseTimer = setTimeout(() => {
      startPhase(roomCode, 1);
    }, ROUND_START_COUNTDOWN_MS);
  }

  // ─── Start Phase ───────────────────────────────────────────

  function startPhase(roomCode: string, phase: Phase): void {
    const room = roomManager.getRoom(roomCode);
    if (!room?.round) return;

    const round = room.round;

    // Clear previous timers
    clearRoundTimers(round);

    room.status = phaseToStatus(phase);
    round.phase = phase;
    const now = Date.now();
    round.phaseStartAt = now;
    round.phaseEndAt = now + room.config.timePerPhaseSec * 1000;
    room.version++;

    // Extract audio data for this phase
    const phaseKey = `phase${phase}` as keyof typeof round.midi.phases;
    const phaseConfig = round.midi.phases[phaseKey];

    io.to(`room:${roomCode}`).emit('phase:start', {
      phase,
      endsAt: round.phaseEndAt,
      audioData: phaseConfig,
      midiFileUrl: round.midi.midiFileUrl,
    });

    broadcastState(io, room);

    // 1-second tick for state sync
    round.tickInterval = setInterval(() => {
      const currentRoom = roomManager.getRoom(roomCode);
      if (!currentRoom) {
        if (round.tickInterval) clearInterval(round.tickInterval);
        return;
      }
      broadcastState(io, currentRoom);
    }, 1000);

    // Phase timeout
    round.phaseTimer = setTimeout(() => {
      endPhase(roomCode);
    }, room.config.timePerPhaseSec * 1000);
  }

  // ─── End Phase ─────────────────────────────────────────────

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

  // ─── End Round ─────────────────────────────────────────────

  function endRound(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room?.round) return;

    const round = room.round;
    clearRoundTimers(round);

    room.status = GameStatus.ROUND_END;
    room.version++;

    // Reveal the answer
    io.to(`room:${roomCode}`).emit('round:reveal', {
      title: round.midi.title,
      artist: round.midi.artist,
      correctPlayerIds: round.correctAnswers.map((a) => a.playerId),
    });

    // Award participation XP to every connected player — rewards showing up and trying,
    // not just winning. Idempotent per (gameSession, round, player).
    for (const player of room.players.values()) {
      if (!player.connected) continue;
      awardXpAsync(
        player.id,
        'multiplayer_round_played',
        `mp_played_${room.gameSessionId}_${room.currentRoundIndex}_${player.id}`,
        XP_MULTIPLAYER_ROUND_PLAYED,
        { roomCode, roundIndex: room.currentRoundIndex },
      );
    }

    broadcastState(io, room);

    // Wait then advance
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

  // ─── End Game ──────────────────────────────────────────────

  function endGame(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    if (room.round) {
      clearRoundTimers(room.round);
    }

    room.status = GameStatus.GAME_END;
    room.round = null;
    room.version++;

    // Final ranking drives both podium bonus XP and first-match-of-day detection.
    const ranking = Array.from(room.players.values())
      .filter((p) => p.connected)
      .sort((a, b) => b.totalScore - a.totalScore);

    ranking.forEach((player, idx) => {
      const position = idx + 1;
      const podiumBonus = XP_MULTIPLAYER_PODIUM[position] ?? 0;
      const amount = XP_MULTIPLAYER_FINISH_BASE + podiumBonus;
      awardXpAsync(
        player.id,
        'multiplayer_finish',
        `mp_finish_${room.gameSessionId}_${player.id}`,
        amount,
        { finalPosition: position, totalPlayers: ranking.length, roomCode },
      );
      awardFirstMatchOfDay(player.id, 'mp');

      // Referral reward — fires once per invitee when they finish their first MP match.
      if (referralService && !player.id.startsWith('guest:')) {
        setImmediate(() => {
          referralService.maybeRewardReferrer(player.id).catch(() => {});
        });
      }
    });

    const msg = makeBotMessage('bot.gameOver');
    roomManager.addChatMessage(roomCode, msg);
    io.to(`room:${roomCode}`).emit('chat:message', msg);

    broadcastState(io, room);
  }

  // ─── Handle Guess ──────────────────────────────────────────

  function handleGuess(roomCode: string, playerId: string, guess: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room?.round) return;

    const round = room.round;
    if (!round.phase) return;

    // Check game is in an active phase
    const status = room.status;
    if (
      status !== GameStatus.PHASE_1 &&
      status !== GameStatus.PHASE_2 &&
      status !== GameStatus.PHASE_3 &&
      status !== GameStatus.PHASE_4
    ) {
      return;
    }

    // Check player hasn't already answered correctly this round
    if (round.correctAnswers.some((a) => a.playerId === playerId)) return;

    const player = room.players.get(playerId);
    if (!player) return;

    const result = verifyGuess(guess, round.midi.acceptedTitles, round.midi.acceptedArtists);

    switch (result.result) {
      case GuessResult.CORRECT: {
        const now = Date.now();
        const existingTimestamps = round.correctAnswers.map((a) => a.timestamp);
        const position = resolveGuessPosition(existingTimestamps, now);
        const hasArtistMatch = round.artistMatchAnswers.some((a) => a.playerId === playerId);
        const score = calculateTitleScore(round.phase, position, hasArtistMatch);

        const answer: CorrectAnswer = {
          playerId,
          timestamp: now,
          phase: round.phase,
          score,
        };
        round.correctAnswers.push(answer);
        player.totalScore += score;
        player.correctCount++;
        room.version++;

        // Award XP for the correct guess. source_ref is tied to this game session + round
        // + player so repeated plays or reconnects never double-award.
        const xpAmount = Math.floor(score / XP_MULTIPLAYER_CORRECT_DIVISOR);
        awardXpAsync(
          playerId,
          'multiplayer_correct',
          `mp_correct_${room.gameSessionId}_${room.currentRoundIndex}_${playerId}`,
          xpAmount,
          { phase: round.phase, position, roomCode, score },
        );

        const msg = makeBotMessage(
          `bot.guessedCorrectly:${JSON.stringify({ nickname: player.nickname, score })}`,
        );
        roomManager.addChatMessage(roomCode, msg);
        io.to(`room:${roomCode}`).emit('chat:message', msg);
        broadcastState(io, room);

        // Check if all connected players have answered
        const connected = connectedPlayerCount(room);
        if (round.correctAnswers.length >= connected) {
          // Everyone got it — skip remaining phases, go straight to reveal
          clearRoundTimers(round);
          endRound(roomCode);
        }
        break;
      }
      case GuessResult.HOT: {
        const msg = makeBotMessage(`bot.hot:${JSON.stringify({ nickname: player.nickname })}`);
        roomManager.addChatMessage(roomCode, msg);
        io.to(`room:${roomCode}`).emit('chat:message', msg);
        break;
      }
      case GuessResult.WARM: {
        const msg = makeBotMessage(`bot.warm:${JSON.stringify({ nickname: player.nickname })}`);
        roomManager.addChatMessage(roomCode, msg);
        io.to(`room:${roomCode}`).emit('chat:message', msg);
        break;
      }
      case GuessResult.ARTIST_MATCH: {
        // Only award artist points once per player per round
        if (round.artistMatchAnswers.some((a) => a.playerId === playerId)) {
          // Already got artist — treat as a regular chat message
          const dupMsg: ChatMessage = {
            id: randomUUID(),
            authorId: playerId,
            text: guess,
            kind: 'player',
            at: Date.now(),
          };
          roomManager.addChatMessage(roomCode, dupMsg);
          io.to(`room:${roomCode}`).emit('chat:message', dupMsg);
          break;
        }

        const now = Date.now();
        const existingArtistTimestamps = round.artistMatchAnswers.map((a) => a.timestamp);
        const artistPosition = resolveGuessPosition(existingArtistTimestamps, now);
        const artistScore = calculateArtistScore(round.phase, artistPosition);

        const artistAnswer: ArtistMatchAnswer = {
          playerId,
          timestamp: now,
          phase: round.phase,
          score: artistScore,
        };
        round.artistMatchAnswers.push(artistAnswer);
        player.totalScore += artistScore;
        room.version++;

        const msg = makeBotMessage(
          `bot.artistMatch:${JSON.stringify({ nickname: player.nickname, score: artistScore })}`,
        );
        roomManager.addChatMessage(roomCode, msg);
        io.to(`room:${roomCode}`).emit('chat:message', msg);
        broadcastState(io, room);
        break;
      }
      case GuessResult.WRONG: {
        // Wrong guesses show as regular chat messages
        const msg: ChatMessage = {
          id: randomUUID(),
          authorId: playerId,
          text: guess,
          kind: 'player',
          at: Date.now(),
        };
        roomManager.addChatMessage(roomCode, msg);
        io.to(`room:${roomCode}`).emit('chat:message', msg);
        break;
      }
    }
  }

  // ─── Handle Chat ───────────────────────────────────────────

  function handleChat(roomCode: string, playerId: string, text: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    // During active phases, all chat is routed through guess verification
    if (
      room.status === GameStatus.PHASE_1 ||
      room.status === GameStatus.PHASE_2 ||
      room.status === GameStatus.PHASE_3 ||
      room.status === GameStatus.PHASE_4
    ) {
      handleGuess(roomCode, playerId, text);
      return;
    }

    // In lobby or other states, send as regular chat
    const msg: ChatMessage = {
      id: randomUUID(),
      authorId: playerId,
      text,
      kind: 'player',
      at: Date.now(),
    };
    roomManager.addChatMessage(roomCode, msg);
    io.to(`room:${roomCode}`).emit('chat:message', msg);
  }

  return { startGame, handleGuess, handleChat };
}
