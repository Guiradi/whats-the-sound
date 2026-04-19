import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export function createAuthResolver(supabase: SupabaseClient) {
  async function resolveUserId(request: FastifyRequest): Promise<string | null> {
    const token = extractBearerToken(request);
    if (!token) return null;
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) return null;
      request.userId = data.user.id;
      return data.user.id;
    } catch {
      return null;
    }
  }

  async function requireAuthenticatedUser(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const userId = await resolveUserId(request);
    if (!userId) {
      reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Login required' },
      });
    }
  }

  return { resolveUserId, requireAuthenticatedUser };
}

export type AuthResolver = ReturnType<typeof createAuthResolver>;
