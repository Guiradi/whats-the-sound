import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthResolver } from './auth.js';

async function isAdminUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
  return data?.role === 'admin';
}

export function createAdminPreHandler(supabase: SupabaseClient, auth: AuthResolver) {
  return async function adminPreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const userId = await auth.resolveUserId(request);
    if (!userId || !(await isAdminUser(supabase, userId))) {
      reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    }
  };
}
