import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { EnvValidationError } from '@wts/shared/env';
import Fastify from 'fastify';
import { env } from './env.js';
import { getSupabaseAdmin } from './lib/supabase.js';
import { registerErrorHandlers } from './middleware/error-handler.js';
import { createAdminRoutes } from './routes/admin.js';
import { createCatalogRoutes } from './routes/catalog.js';
import { createDailyRoutes } from './routes/daily.js';
import { healthRoutes } from './routes/health.js';
import { createMeRoutes } from './routes/me.js';
import { roomsRoutes } from './routes/rooms.js';
import { createXpRoutes } from './routes/xp.js';
import { createAchievementService } from './services/achievement-service.js';
import { startDailyCron } from './services/daily-cron.js';
import { createDailyService } from './services/daily-service.js';
import { createLoginService } from './services/login-service.js';
import { createReferralService } from './services/referral-service.js';
import { createXpService } from './services/xp-service.js';
import { initSocketServer } from './socket/index.js';
import type { TypedServer } from './socket/index.js';

async function main() {
  const server = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'production'
          ? undefined
          : {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss' },
            },
    },
  });

  await server.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
  });

  // REST API rate limiting: 60 req/min per IP (anonymous)
  await server.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute',
  });

  registerErrorHandlers(server);

  await server.register(healthRoutes);
  await server.register(roomsRoutes);

  // Daily Sound routes + cron (only when Supabase is configured)
  let xpServiceRef: ReturnType<typeof createXpService> | null = null;
  let referralServiceRef: ReturnType<typeof createReferralService> | null = null;
  let achievementServiceRef: ReturnType<typeof createAchievementService> | null = null;
  if (env.SUPABASE_URL && env.SUPABASE_SECRET_KEY && env.DAILY_SEED) {
    const supabase = getSupabaseAdmin();
    const xpService = createXpService(supabase);
    xpServiceRef = xpService;
    const achievementService = createAchievementService(supabase, xpService);
    achievementServiceRef = achievementService;
    const referralService = createReferralService(supabase, xpService, achievementService);
    referralServiceRef = referralService;
    const dailyService = createDailyService(
      supabase,
      env.DAILY_SEED,
      xpService,
      referralService,
      achievementService,
    );
    await server.register(createDailyRoutes(dailyService));
    startDailyCron(dailyService, server.log);
    server.log.info('Daily Sound routes and cron registered');

    // XP routes (requires Supabase)
    await server.register(createXpRoutes(supabase));
    server.log.info('XP routes registered');

    // Engagement routes: daily login + referral + achievements
    const loginService = createLoginService(supabase, xpService, achievementService);
    await server.register(createMeRoutes(supabase, loginService, achievementService));
    server.log.info('Me routes (login + referral + achievements) registered');

    // Catalog admin routes (requires Supabase)
    await server.register(createCatalogRoutes(supabase));
    server.log.info('Catalog admin routes registered');

    // Admin dashboard routes (requires Supabase)
    await server.register(createAdminRoutes(supabase));
    server.log.info('Admin dashboard routes registered');
  } else {
    server.log.warn(
      'Daily Sound disabled: missing SUPABASE_URL, SUPABASE_SECRET_KEY, or DAILY_SEED',
    );
  }

  // Initialize Socket.io — must be after routes are registered
  const io: TypedServer = initSocketServer(
    server,
    xpServiceRef ?? undefined,
    referralServiceRef ?? undefined,
    achievementServiceRef ?? undefined,
  );

  // Wire the socket server back into xp-service so awardXp() can emit xp:awarded and
  // xp:level_up to per-user rooms. The service is created before socket init, so we
  // set the reference afterwards via setIo().
  if (xpServiceRef) {
    xpServiceRef.setIo(io);
  }
  // Same pattern for achievement-service: wire in the socket after it's initialized so
  // unlock events reach the right per-user room.
  if (achievementServiceRef) {
    achievementServiceRef.setIo(io);
  }

  const shutdown = async (signal: string) => {
    server.log.info({ signal }, 'shutting down');
    if (io) {
      io.close();
    }
    await server.close();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await server.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  if (err instanceof EnvValidationError) {
    // Logger isn't up yet — write directly to stderr in a parseable form.
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
  process.stderr.write(`Fatal startup error: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
