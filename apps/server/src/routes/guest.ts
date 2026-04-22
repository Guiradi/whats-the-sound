import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AuthResolver } from '../middleware/auth.js';

const migrateBodySchema = z.object({
  guestId: z.string().uuid(),
});

export function createGuestRoutes(supabase: SupabaseClient, auth: AuthResolver) {
  return async function guestRoutes(server: FastifyInstance) {
    /**
     * POST /api/guest/migrate
     * Links a guest session (browser UUID) to the authenticated user who just
     * logged in. Sets guest_profiles.migrated_to = userId so historical context
     * can be attributed to the real account.
     * Idempotent: safe to call multiple times.
     */
    server.post('/api/guest/migrate', async (request, reply) => {
      const userId = await auth.resolveUserId(request);
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const parsed = migrateBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid guestId' });
      }

      const { guestId } = parsed.data;

      const { error } = await supabase
        .from('guest_profiles')
        .update({ migrated_to: userId })
        .eq('id', guestId)
        .is('migrated_to', null); // only migrate once

      if (error) {
        request.log.error({ err: error, guestId, userId }, 'guest migrate failed');
        return reply.code(500).send({ error: 'Migration failed' });
      }

      return reply.code(200).send({ ok: true });
    });
  };
}
