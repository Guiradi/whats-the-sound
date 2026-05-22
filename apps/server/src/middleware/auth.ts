import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    /** Verified Bearer JWT for the current request. Used by routes that need
     *  to build a per-request user-scoped supabase client for RLS-enforced reads. */
    userJwt?: string;
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
    if (!token) {
      request.log.warn({ url: request.url }, 'auth: missing bearer token');
      return null;
    }
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        request.log.warn(
          { url: request.url, err: error?.message, status: error?.status },
          'auth: getUser rejected token',
        );
        return null;
      }
      request.userId = data.user.id;
      request.userJwt = token;
      return data.user.id;
    } catch (err) {
      request.log.warn({ url: request.url, err }, 'auth: getUser threw');
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
