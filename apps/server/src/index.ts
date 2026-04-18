import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { EnvValidationError } from '@wts/shared/env';
import Fastify from 'fastify';
import { env } from './env.js';
import { getSupabaseAdmin } from './lib/supabase.js';
import { registerErrorHandlers } from './middleware/error-handler.js';
import { createCatalogRoutes } from './routes/catalog.js';
import { createDailyRoutes } from './routes/daily.js';
import { healthRoutes } from './routes/health.js';
import { roomsRoutes } from './routes/rooms.js';
import { createXpRoutes } from './routes/xp.js';
import { startDailyCron } from './services/daily-cron.js';
import { createDailyService } from './services/daily-service.js';
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
  if (env.SUPABASE_URL && env.SUPABASE_SECRET_KEY && env.DAILY_SEED) {
    const supabase = getSupabaseAdmin();
    const dailyService = createDailyService(supabase, env.DAILY_SEED);
    await server.register(createDailyRoutes(dailyService));
    startDailyCron(dailyService, server.log);
    server.log.info('Daily Sound routes and cron registered');

    // XP routes (requires Supabase)
    await server.register(createXpRoutes(supabase));
    server.log.info('XP routes registered');

    // Catalog admin routes (requires Supabase)
    await server.register(createCatalogRoutes(supabase));
    server.log.info('Catalog admin routes registered');
  } else {
    server.log.warn(
      'Daily Sound disabled: missing SUPABASE_URL, SUPABASE_SECRET_KEY, or DAILY_SEED',
    );
  }

  // Initialize Socket.io — must be after routes are registered
  const io: TypedServer = initSocketServer(server);

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
