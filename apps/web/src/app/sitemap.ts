import { APP_BASE_URL } from '@/lib/app-url';
import type { MetadataRoute } from 'next';

const LOCALES = ['pt-BR', 'en'];

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/daily', '/rooms', '/login', '/terms', '/privacy'];

  return pages.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${APP_BASE_URL}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: page === '/daily' ? ('daily' as const) : ('weekly' as const),
      priority: page === '' ? 1 : page === '/daily' ? 0.9 : 0.7,
    })),
  );
}
