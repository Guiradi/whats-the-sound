import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface WireError {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Global error handler. Produces a stable `{ error: { code, message } }` shape
 * and prevents stack traces / internal messages from leaking to clients.
 * Operational errors (4xx) surface their original message; crashes (5xx) are
 * logged fully and the client sees a generic message.
 */
export function registerErrorHandlers(server: FastifyInstance): void {
  server.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply): WireError => {
      const statusCode = error.statusCode ?? 500;
      const code = resolveErrorCode(error, statusCode);

      if (statusCode >= 500) {
        request.log.error({ err: error, code }, 'Unhandled error in request');
      } else {
        request.log.warn({ err: error, code }, 'Operational error');
      }

      reply.status(statusCode);
      return {
        error: {
          code,
          message: statusCode >= 500 ? 'Internal server error' : error.message,
        },
      };
    },
  );

  server.setNotFoundHandler((request, reply): WireError => {
    reply.status(404);
    return {
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    };
  });
}

function resolveErrorCode(error: FastifyError, statusCode: number): string {
  if (typeof error.code === 'string' && error.code.length > 0) return error.code;
  if (statusCode === 400) return 'BAD_REQUEST';
  if (statusCode === 401) return 'UNAUTHORIZED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 409) return 'CONFLICT';
  if (statusCode === 422) return 'UNPROCESSABLE_ENTITY';
  if (statusCode === 429) return 'RATE_LIMITED';
  return 'INTERNAL_ERROR';
}
