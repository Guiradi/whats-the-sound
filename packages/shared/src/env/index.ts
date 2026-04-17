import type { ZodError, ZodSchema, ZodTypeDef } from 'zod';

export interface DefineEnvOptions {
  /** Where the env is being parsed (used in error messages). */
  context: string;
  /**
   * Whether to skip parsing and return a typed proxy that throws on access.
   * Useful for build-time tooling where env may be unavailable.
   */
  skip?: boolean;
}

export class EnvValidationError extends Error {
  constructor(
    public readonly context: string,
    public readonly issues: ZodError['issues'],
  ) {
    const formatted = issues
      .map((i) => `  - ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    super(
      `Environment validation failed for ${context}:\n${formatted}\n\nCheck your .env.example for the expected schema.`,
    );
    this.name = 'EnvValidationError';
  }
}

/**
 * Validate `process.env` against a Zod schema. On failure, throws a clear,
 * developer-friendly error listing every missing/invalid key.
 *
 * Usage:
 *   const env = defineEnv(z.object({ PORT: z.coerce.number() }), { context: 'server' });
 */
export function defineEnv<T extends object, Def extends ZodTypeDef, In>(
  schema: ZodSchema<T, Def, In>,
  options: DefineEnvOptions,
): T {
  if (options.skip) {
    const handler: ProxyHandler<object> = {
      get(_target, prop) {
        throw new Error(
          `Env access skipped (${options.context}); attempted to read "${String(prop)}".`,
        );
      },
    };
    return new Proxy({}, handler) as T;
  }
  const result = schema.safeParse(process.env);
  if (!result.success) {
    throw new EnvValidationError(options.context, result.error.issues);
  }
  return result.data;
}
