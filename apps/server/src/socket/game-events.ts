import type { ClientToServerEvents, ServerToClientEvents } from '@wts/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Server, Socket } from 'socket.io';
import type { SocketRateLimiter } from '../middleware/rate-limiter.js';
import type { GameLoop } from '../services/game-loop.js';
import { emitSocketError, emitSocketRateLimited } from './emit-error.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerGameEvents(
  socket: TypedSocket,
  _io: TypedServer,
  gameLoop: GameLoop,
  rateLimiter: SocketRateLimiter,
  logger: FastifyBaseLogger,
): void {
  socket.on('game:start', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const error = gameLoop.startGame(roomCode, socket.data.userId);
    if (error) {
      emitSocketError(socket, logger, error, error, { roomCode });
    }
  });

  socket.on('game:guess', (guess) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    if (typeof guess !== 'string' || guess.length === 0 || guess.length > 200) return;

    const rateCheck = rateLimiter.checkGuess(socket.data.userId);
    if (!rateCheck.allowed) {
      emitSocketRateLimited(socket, logger, 'game:guess', rateCheck.retryAfterMs);
      return;
    }

    gameLoop.handleGuess(roomCode, socket.data.userId, guess);
  });

  socket.on('chat:send', (text) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    if (typeof text !== 'string' || text.length === 0 || text.length > 500) return;

    const rateCheck = rateLimiter.checkMessage(socket.data.userId);
    if (!rateCheck.allowed) {
      emitSocketRateLimited(socket, logger, 'chat:send', rateCheck.retryAfterMs);
      return;
    }

    gameLoop.handleChat(roomCode, socket.data.userId, text);
  });
}
