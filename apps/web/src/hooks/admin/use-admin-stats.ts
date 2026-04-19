'use client';

import { useApiData } from '@/hooks/use-api-data';
import { adminStatsSchema } from '@wts/shared';

export function useAdminStats() {
  return useApiData({
    path: '/api/admin/stats',
    schema: adminStatsSchema,
  });
}
