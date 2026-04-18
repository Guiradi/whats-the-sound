import type { SupabaseClient } from '@supabase/supabase-js';
import { XP_DAILY_CAP, xpForLevel } from '@wts/shared/constants';
import type { XpEvent, XpProfileData } from '@wts/shared/types';
import type { FastifyInstance } from 'fastify';

function getBRTDateRange(): { start: string; end: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayBRT = formatter.format(now);
  return {
    start: `${todayBRT}T00:00:00-03:00`,
    end: `${todayBRT}T23:59:59-03:00`,
  };
}

export function createXpRoutes(supabase: SupabaseClient) {
  return async function xpRoutes(server: FastifyInstance) {
    /**
     * GET /api/me/xp — Get XP profile for the authenticated user.
     * Returns current XP, level, progress, today's earned XP, and recent events.
     */
    server.get('/api/me/xp', async (request, reply) => {
      const userId = request.headers['x-user-id'] as string | undefined;
      if (!userId) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Login required' },
        });
      }

      try {
        // Fetch user XP and level
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

        const { xp, level } = userData as { xp: number; level: number };

        // Fetch today's earned XP
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

        const todayEarned = (todayEvents ?? []).reduce(
          (acc: number, row: { amount: number }) => acc + row.amount,
          0,
        );

        // Fetch last 10 XP events
        const { data: recentData, error: recentError } = await supabase
          .from('xp_events')
          .select('id, user_id, source, source_ref, amount, capped, context, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentError) {
          request.log.error(recentError, 'Failed to fetch recent XP events');
        }

        const recentEvents: XpEvent[] =
          (
            recentData as
              | {
                  id: string;
                  user_id: string;
                  source: string;
                  source_ref: string;
                  amount: number;
                  capped: boolean;
                  context: Record<string, unknown>;
                  created_at: string;
                }[]
              | null
          )?.map((row) => ({
            id: row.id,
            userId: row.user_id,
            source: row.source as XpEvent['source'],
            sourceRef: row.source_ref,
            amount: row.amount,
            capped: row.capped,
            context: row.context,
            createdAt: row.created_at,
          })) ?? [];

        const nextLevelXp = xpForLevel(level + 1);

        const profile: XpProfileData = {
          xp,
          level,
          nextLevelXp,
          todayEarned,
          todayCap: XP_DAILY_CAP,
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
