import { cn } from '@/lib/utils';
import type { PhaseHints as PhaseHintsData } from '@wts/shared';
import { Calendar, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PhaseHintsProps {
  hints: PhaseHintsData;
  /** Translation namespace for category labels (e.g. 'room.categories'). */
  categoryNamespace?: string;
  className?: string;
}

export function PhaseHints({
  hints,
  categoryNamespace = 'room.categories',
  className,
}: PhaseHintsProps) {
  const t = useTranslations('hints');
  const tCategories = useTranslations(categoryNamespace);

  if (hints.year == null && hints.category == null) return null;

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-3 text-sm', className)}>
      {hints.year != null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-bg-border bg-bg-surface px-3 py-1 text-text-secondary">
          <Calendar className="h-3.5 w-3.5 text-accent-cyan" aria-hidden="true" />
          <span className="text-xs uppercase tracking-wider text-text-muted">{t('year')}</span>
          <span className="font-medium text-text-primary">{hints.year}</span>
        </span>
      )}
      {hints.category != null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-bg-border bg-bg-surface px-3 py-1 text-text-secondary">
          <Tag className="h-3.5 w-3.5 text-accent-magenta" aria-hidden="true" />
          <span className="text-xs uppercase tracking-wider text-text-muted">{t('genre')}</span>
          <span className="font-medium text-text-primary">
            {tCategories(hints.category as never)}
          </span>
        </span>
      )}
    </div>
  );
}
