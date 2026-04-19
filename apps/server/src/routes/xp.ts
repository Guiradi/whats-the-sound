import type { SupabaseClient } from '@supabase/supabase-js';
import { getBRTDateRange, sumXpEvents } from '@wts/shared';
import { XP_DAILY_SAFETY_CAP, xpForLevel } from '@wts/shared/constants';
import type { XpEvent, XpProfileData } from '@wts/shared/types';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AuthResolver } from '../middleware/auth.js';
import { userXpRowSchema, xpEventRowSchema } from '../types/db-rows.js';

const xpEventListSchema = z.array(xpEventRowSchema);

export function createXpRoutes(supabase: SupabaseClient, auth: AuthResolver) {
  return async function xpRoutes(server: FastifyInstance) {
    server.get('/api/me/xp', async (request, reply) => {
      const userId = await auth.resolveUserId(request);
      if (!userId) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Login required' },
        });
      }

      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('xp, level')
          .eq('id', userId)
          .maybeSingle();

        if (userError || !userData) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'User not found' },
          });
        }

        const profileRow = userXpRowSchema.parse(userData);
        const xp = profileRow.xp;
        const level = profileRow.level ?? 0;

        const { start, end } = getBRTDateRange();
        const { data: todayEvents, error: todayError } = await supabase
          .from('xp_events')
          .select('amount')
          .eq('user_id', userId)
          .eq('capped', false)
          .gte('created_at', start)
          .lte('created_at', end);

        if (todayError) {
          request.log.error(todayError, 'Failed to fetch today XP events');
        }

        const todayEarned = sumXpEvents(todayEvents);

        const { data: recentData, error: recentError } = await supabase
          .from('xp_events')
          .select('id, user_id, source, source_ref, amount, capped, context, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentError) {
          request.log.error(recentError, 'Failed to fetch recent XP events');
        }

        const parsedRecent = xpEventListSchema.safeParse(recentData ?? []);
        const recentEvents: XpEvent[] = parsedRecent.success
          ? parsedRecent.data.map((row) => ({
              id: row.id,
              userId: row.user_id,
              source: row.source as XpEvent['source'],
              sourceRef: row.source_ref,
              amount: row.amount,
              capped: row.capped,
              context: row.context ?? {},
              createdAt: row.created_at,
            }))
          : [];

        const nextLevelXp = xpForLevel(level + 1);

        const profile: XpProfileData = {
          xp,
          level,
          nextLevelXp,
          todayEarned,
          todayCap: XP_DAILY_SAFETY_CAP,
          recentEvents,
        };

        return profile;
      } catch (err) {
        request.log.error(err, 'Failed to get XP profile');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to load XP profile' },
        });
      }
    });
  };
}
