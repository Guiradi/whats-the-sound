import { randomUUID } from 'node:crypto';
import { GameStatus, GuessResult, MIN_PLAYERS_PER_ROOM } from '@wts/shared';
import type { ChatMessage } from '@wts/shared';
import type { TypedServer } from '../socket/index.js';
import type { CorrectAnswer, ServerRoomState, ServerRoundState } from '../types/room.js';
import { verifyGuess } from './guess-verifier.js';
import type { MidiProvider } from './midi-provider.js';
import * as roomManager from './room-manager.js';
import { calculateScore, resolveGuessPosition } from './scoring.js';

const ROUND_START_COUNTDOWN_MS = 3000;
const ROUND_END_DISPLAY_MS = 5000;

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

export function createGameLoop(io: TypedServer, midiProvider: MidiProvider): GameLoop {
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
        const score = calculateScore(round.phase, position);

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
        const msg = makeBotMessage(
          `bot.artistMatch:${JSON.stringify({ nickname: player.nickname })}`,
        );
        roomManager.addChatMessage(roomCode, msg);
        io.to(`room:${roomCode}`).emit('chat:message', msg);
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
