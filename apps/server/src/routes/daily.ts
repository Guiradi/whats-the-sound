import { getTodayBRT } from '@wts/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AuthResolver } from '../middleware/auth.js';
import type { DailyService } from '../services/daily-service.js';

const guessSchema = z
  .object({
    guess: z.string().max(200).optional(),
    phase: z.number().int().min(1).max(4) as z.ZodType<1 | 2 | 3 | 4>,
    skip: z.boolean().optional(),
  })
  .refine((data) => data.skip === true || (data.guess !== undefined && data.guess.length > 0), {
    message: 'guess is required unless skip is true',
  });

/**
 * Synchronously extract the `sub` (user id) claim from a Bearer JWT without
 * verifying the signature. Used as a rate-limit bucket key only — actual auth
 * still goes through `auth.resolveUserId` and validates against Supabase. A
 * forged JWT lets an attacker DoS *themselves* into a bucket, which is fine.
 */
function jwtSubject(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

export function createDailyRoutes(dailyService: DailyService, auth: AuthResolver) {
  return async function dailyRoutes(server: FastifyInstance) {
    server.get('/api/daily', async (request, reply) => {
      const today = getTodayBRT();
      const userId = await auth.resolveUserId(request);

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

    server.post(
      '/api/daily/guess',
      {
        config: {
          // Per-user limits: prevent oracle-style brute force of accepted_titles
          // (each guess returns CORRECT/HOT/WARM/WRONG). Falls back to per-IP
          // when no JWT is present (which we then reject with 401 below).
          rateLimit: {
            max: 30,
            timeWindow: '1 day',
            keyGenerator: (req) => jwtSubject(req as FastifyRequest) ?? `ip:${req.ip}`,
          },
        },
      },
      async (request, reply) => {
      const userId = await auth.resolveUserId(request);
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
      const { guess, phase, skip } = parsed.data;

      try {
        const result = await dailyService.submitGuess(
          userId,
          today,
          phase,
          guess ?? '',
          skip === true,
        );
        return result;
      } catch (err) {
        request.log.error(err, 'Failed to submit daily guess');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to process guess' },
        });
      }
    },
    );

    server.get('/api/daily/result', async (request, reply) => {
      const userId = await auth.resolveUserId(request);
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

    server.get('/api/daily/history', async (request, reply) => {
      const userId = await auth.resolveUserId(request);
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
