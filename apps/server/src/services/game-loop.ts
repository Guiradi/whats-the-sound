import { randomUUID } from 'node:crypto';
import {
  GameStatus,
  GuessResult,
  MIN_PLAYERS_PER_ROOM,
  calculateArtistScore,
  calculateTitleScore,
  isActivePhase,
  resolveGuessPosition,
  verifyGuess,
} from '@wts/shared';
import type { TypedServer } from '../socket/index.js';
import type { ArtistMatchAnswer, CorrectAnswer } from '../types/room.js';
import type { AchievementService } from './achievement-service.js';
import { broadcastBotEvent, broadcastPlayerMessage } from './bot-broadcaster.js';
import type { MidiProvider } from './midi-provider.js';
import { createMultiplayerXpAwarder } from './multiplayer-xp-awarder.js';
import type { PhaseClipManager } from './phase-clip-manager.js';
import type { ReferralService } from './referral-service.js';
import * as roomManager from './room-manager.js';
import {
  broadcastRoomState,
  clearRoundTimers,
  connectedPlayerCount,
  createRoundOrchestrator,
} from './round-orchestrator.js';
import type { XpService } from './xp-service.js';

export interface GameLoop {
  startGame(roomCode: string, hostId: string): string | null;
  handleGuess(roomCode: string, playerId: string, guess: string): void;
  handleChat(roomCode: string, playerId: string, text: string): void;
}

export function createGameLoop(
  io: TypedServer,
  midiProvider: MidiProvider,
  phaseClipManager: PhaseClipManager,
  xpService?: XpService,
  referralService?: ReferralService,
  achievementService?: AchievementService,
): GameLoop {
  const xpAwarder = createMultiplayerXpAwarder(xpService);
  const orchestrator = createRoundOrchestrator({
    io,
    xpAwarder,
    phaseClipManager,
    referralService,
    achievementService,
  });

  function startGame(roomCode: string, hostId: string): string | null {
    const room = roomManager.getRoom(roomCode);
    if (!room) return 'ROOM_NOT_FOUND';

    if (room.hostId !== hostId) return 'NOT_HOST';
    if (room.status !== GameStatus.LOBBY && room.status !== GameStatus.GAME_END)
      return 'INVALID_STATE';
    if (connectedPlayerCount(room) < MIN_PLAYERS_PER_ROOM) return 'NOT_ENOUGH_PLAYERS';

    for (const player of room.players.values()) {
      player.totalScore = 0;
      player.correctCount = 0;
      player.isReady = false;
    }

    room.currentRoundIndex = 0;
    room.gameSessionId = randomUUID();
    room.version++;

    midiProvider
      .getMidis(room.config.category, room.config.maxRounds)
      .then((midis) => {
        const currentRoom = roomManager.getRoom(roomCode);
        if (!currentRoom) return;

        if (midis.length === 0) {
          broadcastBotEvent(io, roomCode, 'noSongsAvailable');
          currentRoom.status = GameStatus.LOBBY;
          currentRoom.version++;
          broadcastRoomState(io, currentRoom);
          return;
        }

        room.playlist = midis;
        broadcastBotEvent(io, roomCode, 'gameStarting', { rounds: midis.length });
        orchestrator.startRound(roomCode);
      })
      .catch(() => {
        const currentRoom = roomManager.getRoom(roomCode);
        if (currentRoom) {
          currentRoom.status = GameStatus.LOBBY;
          currentRoom.version++;
          broadcastRoomState(io, currentRoom);
        }
      });

    return null;
  }

  function handleGuess(roomCode: string, playerId: string, guess: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room?.round) return;

    const round = room.round;
    if (!round.phase) return;
    if (!isActivePhase(room.status)) return;
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

        xpAwarder.awardCorrectGuess({
          playerId,
          gameSessionId: room.gameSessionId,
          roundIndex: room.currentRoundIndex,
          score,
          phase: round.phase,
          position,
          roomCode,
        });

        broadcastBotEvent(io, roomCode, 'guessedCorrectly', {
          nickname: player.nickname,
          score,
        });
        broadcastRoomState(io, room);

        const connected = connectedPlayerCount(room);
        if (round.correctAnswers.length >= connected) {
          clearRoundTimers(round);
          orchestrator.endRound(roomCode);
        }
        break;
      }
      case GuessResult.HOT: {
        broadcastBotEvent(io, roomCode, 'hot', { nickname: player.nickname });
        break;
      }
      case GuessResult.WARM: {
        broadcastBotEvent(io, roomCode, 'warm', { nickname: player.nickname });
        break;
      }
      case GuessResult.ARTIST_MATCH: {
        if (round.artistMatchAnswers.some((a) => a.playerId === playerId)) {
          broadcastPlayerMessage(io, roomCode, playerId, guess);
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

        broadcastBotEvent(io, roomCode, 'artistMatch', {
          nickname: player.nickname,
          score: artistScore,
        });
        broadcastRoomState(io, room);
        break;
      }
      case GuessResult.WRONG: {
        broadcastPlayerMessage(io, roomCode, playerId, guess);
        break;
      }
    }
  }

  function handleChat(roomCode: string, playerId: string, text: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    if (isActivePhase(room.status)) {
      handleGuess(roomCode, playerId, text);
      return;
    }

    broadcastPlayerMessage(io, roomCode, playerId, text);
  }

  return { startGame, handleGuess, handleChat };
}
