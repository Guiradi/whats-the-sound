import type { SupabaseClient } from '@supabase/supabase-js';
import { ACHIEVEMENTS } from '@wts/shared/achievements';
import { XP_REFERRAL_BONUS } from '@wts/shared/constants';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AuthResolver } from '../middleware/auth.js';
import type { AchievementService } from '../services/achievement-service.js';
import type { LoginService } from '../services/login-service.js';
import {
  inviteeRowSchema,
  userIdRowSchema,
  userReferralCodeRowSchema,
  userReferralSelfRowSchema,
} from '../types/db-rows.js';

const inviteeListSchema = z.array(inviteeRowSchema);

const applyReferralSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4)
    .max(10)
    .regex(/^[A-Z0-9]+$/i, 'Invalid referral code'),
});

export function createMeRoutes(
  supabase: SupabaseClient,
  loginService: LoginService,
  achievementService: AchievementService | undefined,
  auth: AuthResolver,
) {
  return async function meRoutes(server: FastifyInstance) {
    /**
     * POST /api/me/touch-login — Mark that the user opened the app today (BRT).
     * Updates login_streak, awards daily_login + login_streak_bonus XP.
     * Idempotent per BRT day; safe to call on every app load.
     */
    server.post('/api/me/touch-login', async (request, reply) => {
      const userId = await auth.resolveUserId(request);
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
      const userId = await auth.resolveUserId(request);
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

        const parsedSelf = userReferralSelfRowSchema.safeParse(selfRow);
        if (!parsedSelf.success) {
          return reply.status(500).send({
            error: { code: 'INTERNAL_ERROR', message: 'Invalid user data' },
          });
        }
        const self = parsedSelf.data;

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

        const parsedReferrer = userIdRowSchema.safeParse(referrerRow);
        if (!parsedReferrer.success) {
          return { applied: false, reason: 'invalid_code' };
        }
        const referrerId = parsedReferrer.data.id;
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
      const userId = await auth.resolveUserId(request);
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

        const parsedCode = userReferralCodeRowSchema.safeParse(selfRow);
        const code = parsedCode.success ? parsedCode.data.referral_code : null;

        const { data: invitees } = await supabase
          .from('users')
          .select('id, referral_completed_at')
          .eq('referred_by_user_id', userId);

        const parsedInvitees = inviteeListSchema.safeParse(invitees ?? []);
        const list = parsedInvitees.success ? parsedInvitees.data : [];
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

    /**
     * GET /api/me/achievements — Returns the full achievements catalog plus which ones
     * the caller has unlocked (with timestamp). Clients render unlocked badges colored
     * and locked ones muted.
     */
    server.get('/api/me/achievements', async (request, reply) => {
      const userId = await auth.resolveUserId(request);
      if (!userId) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Login required' },
        });
      }

      try {
        const unlocked = achievementService
          ? await achievementService.listUnlockedForUser(userId)
          : [];
        return {
          catalog: ACHIEVEMENTS,
          unlocked,
        };
      } catch (err) {
        request.log.error(err, 'Failed to fetch achievements');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to load achievements' },
        });
      }
    });
  };
}
