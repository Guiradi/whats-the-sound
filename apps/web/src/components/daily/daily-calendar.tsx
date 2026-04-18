'use client';

import { cn } from '@/lib/utils';
import type { DailyHistoryEntry } from '@wts/shared';
import { useTranslations } from 'next-intl';

interface DailyCalendarProps {
  entries: DailyHistoryEntry[];
  onSelectDay: (entry: DailyHistoryEntry) => void;
}

export function DailyCalendar({ entries, onSelectDay }: DailyCalendarProps) {
  const t = useTranslations('dailyHistory');

  // Build a map of date → entry for fast lookup
  const entryMap = new Map(entries.map((e) => [e.date, e]));

  // Generate last 90 days
  const days: string[] = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Legend */}
      <div className="flex items-center justify-end gap-3 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent-green/60" />
          {t('calendar.correct')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent-red/60" />
          {t('calendar.wrong')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-bg-surface" />
          {t('calendar.notPlayed')}
        </span>
      </div>

      {/* Grid */}
      <div className="flex flex-wrap gap-1">
        {days.map((date) => {
          const entry = entryMap.get(date);
          const isCorrect = entry?.isCorrect ?? false;
          const hasPlayed = !!entry;

          return (
            <button
              key={date}
              type="button"
              onClick={() => entry && onSelectDay(entry)}
              disabled={!entry}
              title={date}
              className={cn(
                'h-4 w-4 rounded-sm transition-colors',
                hasPlayed && isCorrect && 'bg-accent-green/60 hover:bg-accent-green/80',
                hasPlayed && !isCorrect && 'bg-accent-red/60 hover:bg-accent-red/80',
                !hasPlayed && 'bg-bg-surface',
                entry && 'cursor-pointer',
                !entry && 'cursor-default',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
