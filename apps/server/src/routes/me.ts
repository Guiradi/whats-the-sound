import type { SupabaseClient } from '@supabase/supabase-js';
import { XP_REFERRAL_BONUS } from '@wts/shared/constants';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { LoginService } from '../services/login-service.js';

const applyReferralSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4)
    .max(10)
    .regex(/^[A-Z0-9]+$/i, 'Invalid referral code'),
});

export function createMeRoutes(supabase: SupabaseClient, loginService: LoginService) {
  return async function meRoutes(server: FastifyInstance) {
    /**
     * POST /api/me/touch-login — Mark that the user opened the app today (BRT).
     * Updates login_streak, awards daily_login + login_streak_bonus XP.
     * Idempotent per BRT day; safe to call on every app load.
     */
    server.post('/api/me/touch-login', async (request, reply) => {
      const userId = request.headers['x-user-id'] as string | undefined;
      if (!userId) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Login required' },
        });
      }

      try {
        const result = await loginService.touchLogin(userId);
        return result;
      } catch (err) {
        request.log.error(err, 'Failed to touch login');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to record login' },
        });
      }
    });

    /**
     * POST /api/me/apply-referral — Record that this user was referred by another.
     * Only succeeds once per user. Triggers referral reward when this user completes
     * their first match (see daily-service and game-loop for the reward side).
     */
    server.post('/api/me/apply-referral', async (request, reply) => {
      const userId = request.headers['x-user-id'] as string | undefined;
      if (!userId) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Login required' },
        });
      }

      const parsed = applyReferralSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parsed.error.issues[0]?.message ?? 'Invalid input',
          },
        });
      }

      const code = parsed.data.code.toUpperCase();

      try {
        const { data: selfRow } = await supabase
          .from('users')
          .select('referred_by_user_id, referral_code')
          .eq('id', userId)
          .maybeSingle();

        if (!selfRow) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'User not found' },
          });
        }

        const self = selfRow as {
          referred_by_user_id: string | null;
          referral_code: string | null;
        };

        if (self.referred_by_user_id) {
          return { applied: false, reason: 'already_referred' };
        }
        if (self.referral_code === code) {
          return { applied: false, reason: 'self_referral' };
        }

        const { data: referrerRow } = await supabase
          .from('users')
          .select('id')
          .eq('referral_code', code)
          .maybeSingle();

        if (!referrerRow) {
          return { applied: false, reason: 'invalid_code' };
        }

        const referrerId = (referrerRow as { id: string }).id;
        if (referrerId === userId) {
          return { applied: false, reason: 'self_referral' };
        }

        const { error: updateErr } = await supabase
          .from('users')
          .update({
            referred_by_user_id: referrerId,
            referred_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .is('referred_by_user_id', null);

        if (updateErr) {
          request.log.error(updateErr, 'Failed to apply referral');
          return reply.status(500).send({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to apply referral' },
          });
        }

        return { applied: true, referrerId };
      } catch (err) {
        request.log.error(err, 'Failed to apply referral');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to apply referral' },
        });
      }
    });

    /**
     * GET /api/me/referrals — Summary of the authenticated user's referral activity.
     * Returns their code, total invited, and how many have completed a first match.
     */
    server.get('/api/me/referrals', async (request, reply) => {
      const userId = request.headers['x-user-id'] as string | undefined;
      if (!userId) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Login required' },
        });
      }

      try {
        const { data: selfRow } = await supabase
          .from('users')
          .select('referral_code')
          .eq('id', userId)
          .maybeSingle();

        const code = (selfRow as { referral_code: string } | null)?.referral_code ?? null;

        const { data: invitees } = await supabase
          .from('users')
          .select('id, referral_completed_at')
          .eq('referred_by_user_id', userId);

        const list = (invitees ?? []) as { id: string; referral_completed_at: string | null }[];
        const invitedCount = list.length;
        const completedCount = list.filter((r) => r.referral_completed_at !== null).length;

        return {
          code,
          invitedCount,
          completedCount,
          pendingCount: invitedCount - completedCount,
          rewardPerReferral: XP_REFERRAL_BONUS,
        };
      } catch (err) {
        request.log.error(err, 'Failed to fetch referrals');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to load referrals' },
        });
      }
    });
  };
}
