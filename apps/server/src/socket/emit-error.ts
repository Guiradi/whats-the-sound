import type { ClientToServerEvents, ServerToClientEvents } from '@wts/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Socket } from 'socket.io';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function emitSocketError(
  socket: TypedSocket,
  logger: FastifyBaseLogger,
  code: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  logger.warn(
    {
      socketId: socket.id,
      userId: socket.data.userId,
      code,
      message,
      ...(context ?? {}),
    },
    'socket error emitted to client',
  );
  socket.emit('error:generic', { code, message });
}

export function emitSocketRateLimited(
  socket: TypedSocket,
  logger: FastifyBaseLogger,
  scope: string,
  retryAfterMs: number,
): void {
  logger.warn(
    {
      socketId: socket.id,
      userId: socket.data.userId,
      scope,
      retryAfterMs,
    },
    'socket rate limited',
  );
  socket.emit('error:rate_limited', { scope, retryAfterMs });
}
