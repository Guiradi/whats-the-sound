'use client';

import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import Fuse from 'fuse.js';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

interface DocIndexClient {
  slug: string[];
  slugString: string;
  title: string;
  description: string;
}

export function DocsSearch({ entries }: { entries: DocIndexClient[] }) {
  const t = useTranslations('docs');
  const [query, setQuery] = useState('');

  const fuse = useMemo(
    () =>
      new Fuse(entries, {
        keys: ['title', 'description', 'slugString'],
        threshold: 0.4,
        includeScore: false,
      }),
    [entries],
  );

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return fuse.search(trimmed).slice(0, 8);
  }, [query, fuse]);

  return (
    <div className="flex flex-col gap-2">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
      />
      {query.trim() ? (
        <div className="flex flex-col gap-1 rounded-md border border-bg-border bg-bg-surface p-1">
          {results.length === 0 ? (
            <p className="px-2 py-1 text-xs text-text-muted">{t('searchEmpty')}</p>
          ) : (
            results.map(({ item }) => (
              <Link
                key={item.slugString}
                href={`/admin/docs/${item.slugString}`}
                className={cn(
                  'flex flex-col gap-0.5 rounded px-2 py-1 text-sm transition-colors',
                  'hover:bg-bg-surface-hover',
                )}
                onClick={() => setQuery('')}
              >
                <span className="text-text-primary">{item.title}</span>
                {item.description ? (
                  <span className="line-clamp-1 text-xs text-text-muted">{item.description}</span>
                ) : null}
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
