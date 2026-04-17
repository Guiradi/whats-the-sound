import type { ClientToServerEvents, ServerToClientEvents } from '@wts/shared';
import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { env } from '../env.js';
import { SocketRateLimiter } from '../middleware/rate-limiter.js';
import { createGameLoop } from '../services/game-loop.js';
import { StubMidiProvider } from '../services/midi-provider.js';
import { createAuthMiddleware } from './auth-middleware.js';
import { registerGameEvents } from './game-events.js';
import { registerRoomEvents } from './room-events.js';

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

function getSupabase(): import('@supabase/supabase-js').SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return null;
  try {
    const { getSupabaseAdmin } = require('../lib/supabase.js') as {
      getSupabaseAdmin: () => import('@supabase/supabase-js').SupabaseClient;
    };
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

/**
 * Initialize Socket.io server and attach to Fastify's underlying HTTP server.
 * Returns the typed Socket.io server instance for use by game services.
 */
export function initSocketServer(server: FastifyInstance): TypedServer {
  const io: TypedServer = new Server(server.server, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(createAuthMiddleware(getSupabase()));

  // TODO: Replace StubMidiProvider with Supabase-backed provider in TASK-018
  const midiProvider = new StubMidiProvider();
  const gameLoop = createGameLoop(io, midiProvider);
  const rateLimiter = new SocketRateLimiter();

  io.on('connection', (socket) => {
    server.log.info({ socketId: socket.id, userId: socket.data.userId }, 'socket connected');

    registerRoomEvents(socket, io, rateLimiter);
    registerGameEvents(socket, io, gameLoop, rateLimiter);

    socket.on('disconnect', (reason) => {
      server.log.info({ socketId: socket.id, reason }, 'socket disconnected');
      rateLimiter.cleanup(socket.data.userId);
    });
  });

  server.log.info('Socket.io server initialized');
  return io;
}
