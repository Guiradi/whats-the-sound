'use client';

import { useApiData } from '@/hooks/use-api-data';
import { catalogListResponseSchema } from '@wts/shared';
import { useMemo } from 'react';

interface CatalogItemsQuery {
  search?: string;
  category?: string;
  difficulty?: string;
  showInactive?: boolean;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

function buildCatalogQuery(q: CatalogItemsQuery): string {
  const params = new URLSearchParams();
  if (q.search) params.set('search', q.search);
  if (q.category) params.set('category', q.category);
  if (q.difficulty) params.set('difficulty', q.difficulty);
  params.set('activeOnly', q.showInactive ? 'false' : 'true');
  params.set('limit', String(q.pageSize));
  params.set('offset', String(q.page * q.pageSize));
  params.set('sortBy', q.sortBy);
  params.set('sortDir', q.sortDir);
  return params.toString();
}

export function useCatalogItems(query: CatalogItemsQuery) {
  const path = useMemo(() => `/api/catalog?${buildCatalogQuery(query)}`, [query]);
  return useApiData({
    path,
    schema: catalogListResponseSchema,
    deps: [path],
  });
}
