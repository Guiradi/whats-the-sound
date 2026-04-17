import type { ClientToServerEvents, ServerToClientEvents } from '@wts/shared';
import type { Server, Socket } from 'socket.io';
import type { SocketRateLimiter } from '../middleware/rate-limiter.js';
import type { GameLoop } from '../services/game-loop.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerGameEvents(
  socket: TypedSocket,
  _io: TypedServer,
  gameLoop: GameLoop,
  rateLimiter: SocketRateLimiter,
): void {
  socket.on('game:start', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    gameLoop.startGame(roomCode, socket.data.userId);
  });

  socket.on('game:guess', (guess) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    if (typeof guess !== 'string' || guess.length === 0 || guess.length > 200) return;

    const rateCheck = rateLimiter.checkGuess(socket.data.userId);
    if (!rateCheck.allowed) {
      socket.emit('error:rate_limited', {
        scope: 'game:guess',
        retryAfterMs: rateCheck.retryAfterMs,
      });
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
      socket.emit('error:rate_limited', {
        scope: 'chat:send',
        retryAfterMs: rateCheck.retryAfterMs,
      });
      return;
    }

    gameLoop.handleChat(roomCode, socket.data.userId, text);
  });
}
