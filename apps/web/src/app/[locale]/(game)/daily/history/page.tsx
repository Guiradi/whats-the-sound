'use client';

import { DailyCalendar } from '@/components/daily/daily-calendar';
import { DailyStats } from '@/components/daily/daily-stats';
import { DayDetailModal } from '@/components/daily/day-detail-modal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Link } from '@/i18n/navigation';
import { authFetch } from '@/lib/api-client';
import type { DailyHistoryEntry } from '@wts/shared';
import { dailyHistoryResponseSchema } from '@wts/shared';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

export default function DailyHistoryPage() {
  const t = useTranslations('dailyHistory');
  const { user, isLoading: authLoading } = useAuth();
  const [entries, setEntries] = useState<DailyHistoryEntry[]>([]);
  const [streak, setStreak] = useState({ currentStreak: 0, maxStreak: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<DailyHistoryEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    async function loadHistory() {
      try {
        const res = await authFetch('/api/daily/history');
        if (!res.ok) throw new Error('Failed to load history');
        const parsed = dailyHistoryResponseSchema.safeParse(await res.json());
        if (parsed.success) {
          setEntries(parsed.data.entries as DailyHistoryEntry[]);
          setStreak(parsed.data.streak);
        }
      } catch {
        // Silently fail — show empty state
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [user, authLoading]);

  const handleSelectDay = useCallback((entry: DailyHistoryEntry) => {
    setSelectedEntry(entry);
    setModalOpen(true);
  }, []);

  // Auth guard
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-text-muted">{t('loginRequired')}</p>
        <Link href="/login">
          <Button size="sm">Login</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/daily">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent-cyan" />
          <h1 className="font-display text-xl font-bold">{t('title')}</h1>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-center text-sm text-text-muted">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Stats */}
          <DailyStats
            entries={entries}
            currentStreak={streak.currentStreak}
            maxStreak={streak.maxStreak}
          />

          {/* Calendar */}
          <DailyCalendar entries={entries} onSelectDay={handleSelectDay} />
        </div>
      )}

      {/* Day detail modal */}
      <DayDetailModal entry={selectedEntry} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
