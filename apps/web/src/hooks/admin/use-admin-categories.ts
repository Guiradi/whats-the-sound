'use client';

import { useApiData } from '@/hooks/use-api-data';
import { adminCategoriesResponseSchema } from '@wts/shared';

export function useAdminCategories(enabled = true) {
  return useApiData({
    path: '/api/admin/categories',
    schema: adminCategoriesResponseSchema,
    enabled,
  });
}
