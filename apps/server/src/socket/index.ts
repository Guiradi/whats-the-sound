import type { ClientToServerEvents, ServerToClientEvents } from '@wts/shared';
import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { env } from '../env.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { SocketRateLimiter } from '../middleware/rate-limiter.js';
import type { AchievementService } from '../services/achievement-service.js';
import { createGameLoop } from '../services/game-loop.js';
import { PhaseClipManager } from '../services/phase-clip-manager.js';
import type { ReferralService } from '../services/referral-service.js';
import { SupabaseMidiProvider } from '../services/supabase-midi-provider.js';
import type { XpService } from '../services/xp-service.js';
import { createAuthMiddleware } from './auth-middleware.js';
import { registerGameEvents } from './game-events.js';
import { registerRoomEvents } from './room-events.js';

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

function getSupabase(): import('@supabase/supabase-js').SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return null;
  try {
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

/**
 * Initialize Socket.io server and attach to Fastify's underlying HTTP server.
 * Returns the typed Socket.io server instance for use by game services.
 */
export function initSocketServer(
  server: FastifyInstance,
  xpService?: XpService,
  referralService?: ReferralService,
  achievementService?: AchievementService,
): TypedServer {
  const io: TypedServer = new Server(server.server, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(createAuthMiddleware(getSupabase()));

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      'Supabase is required for the game server. Set SUPABASE_URL and SUPABASE_SECRET_KEY.',
    );
  }
  const midiProvider = new SupabaseMidiProvider(supabase);
  const phaseClipManager = new PhaseClipManager(supabase, server.log);
  const gameLoop = createGameLoop(
    io,
    midiProvider,
    phaseClipManager,
    xpService,
    referralService,
    achievementService,
  );
  const rateLimiter = new SocketRateLimiter();

  io.on('connection', (socket) => {
    server.log.info({ socketId: socket.id, userId: socket.data.userId }, 'socket connected');

    // Join a per-user room so server-side services (e.g. xp-service) can emit targeted
    // notifications (xp:awarded, xp:level_up) regardless of which game room the user is in.
    // Guests still earn no XP, so we only join real authenticated users.
    if (!socket.data.isGuest && socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
    }

    registerRoomEvents(socket, io, rateLimiter, server.log, supabase);
    registerGameEvents(socket, io, gameLoop, rateLimiter, server.log);

    socket.on('disconnect', (reason) => {
      server.log.info({ socketId: socket.id, reason }, 'socket disconnected');
      rateLimiter.cleanup(socket.data.userId);
    });
  });

  server.log.info('Socket.io server initialized');
  return io;
}
