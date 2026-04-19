'use client';

import { authFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';

interface UseApiDataOptions<TRaw, TParsed> {
  schema: z.ZodType<TParsed, z.ZodTypeDef, TRaw>;
  path: string;
  enabled?: boolean;
  deps?: ReadonlyArray<unknown>;
}

export interface UseApiDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApiData<TParsed, TRaw = unknown>(
  options: UseApiDataOptions<TRaw, TParsed>,
): UseApiDataResult<TParsed> {
  const { schema, path, enabled = true, deps = [] } = options;
  const [data, setData] = useState<TParsed | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchOnce = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(path);
      if (!res.ok) {
        setError(`Request failed (${res.status})`);
        return;
      }
      const parsed = schema.safeParse(await res.json());
      if (parsed.success) {
        setData(parsed.data);
      } else {
        setError('Invalid response shape');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, [path, schema, ...deps]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    fetchOnce();
  }, [enabled, fetchOnce]);

  return { data, isLoading, error, refetch: fetchOnce };
}
