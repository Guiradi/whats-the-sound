import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DailyService } from '../services/daily-service.js';
import { getTodayBRT } from '../services/daily-service.js';

const guessSchema = z.object({
  guess: z.string().min(1).max(200),
  phase: z.number().int().min(1).max(4) as z.ZodType<1 | 2 | 3 | 4>,
});

export function createDailyRoutes(dailyService: DailyService) {
  return async function dailyRoutes(server: FastifyInstance) {
    /**
     * GET /api/daily — Get today's daily challenge.
     * Returns MIDI ID, category, day number, current phase audio data.
     * NEVER returns title or artist before completion.
     */
    server.get('/api/daily', async (request, reply) => {
      const today = getTodayBRT();
      const userId = (request.headers['x-user-id'] as string) ?? null;

      try {
        const state = await dailyService.getDailyForUser(userId, today);
        return state;
      } catch (err) {
        request.log.error(err, 'Failed to get daily');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to load daily challenge' },
        });
      }
    });

    /**
     * POST /api/daily/guess — Submit a guess for the daily challenge.
     * Requires authenticated user (x-user-id header from auth middleware).
     */
    server.post('/api/daily/guess', async (request, reply) => {
      const userId = request.headers['x-user-id'] as string | undefined;
      if (!userId) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Login required to submit daily guesses' },
        });
      }

      const parsed = guessSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parsed.error.issues[0]?.message ?? 'Invalid input',
          },
        });
      }

      const today = getTodayBRT();
      const { guess, phase } = parsed.data;

      try {
        const result = await dailyService.submitGuess(userId, today, phase, guess);
        return result;
      } catch (err) {
        request.log.error(err, 'Failed to submit daily guess');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to process guess' },
        });
      }
    });

    /**
     * GET /api/daily/result — Get user's result for today.
     */
    server.get('/api/daily/result', async (request, reply) => {
      const userId = request.headers['x-user-id'] as string | undefined;
      if (!userId) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Login required' },
        });
      }

      const today = getTodayBRT();

      try {
        const result = await dailyService.getResultForUser(userId, today);
        if (!result) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'No result for today' },
          });
        }

        const streak = await dailyService.getStreakInfo(userId);
        return { ...result, streak };
      } catch (err) {
        request.log.error(err, 'Failed to get daily result');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to load result' },
        });
      }
    });

    /**
     * GET /api/daily/history — Paginated history for logged-in user.
     */
    server.get('/api/daily/history', async (request, reply) => {
      const userId = request.headers['x-user-id'] as string | undefined;
      if (!userId) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Login required to view history' },
        });
      }

      const query = request.query as { limit?: string; offset?: string };
      const limit = Math.min(Number(query.limit) || 90, 365);
      const offset = Math.max(Number(query.offset) || 0, 0);

      try {
        const entries = await dailyService.getHistory(userId, limit, offset);
        const streak = await dailyService.getStreakInfo(userId);
        return { entries, streak };
      } catch (err) {
        request.log.error(err, 'Failed to get daily history');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to load history' },
        });
      }
    });
  };
}
