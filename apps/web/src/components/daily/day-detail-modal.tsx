'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { DailyHistoryEntry } from '@wts/shared';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DayDetailModalProps {
  entry: DailyHistoryEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DayDetailModal({ entry, open, onOpenChange }: DayDetailModalProps) {
  const t = useTranslations('dailyHistory');

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="sr-only">
          {entry.title} — {entry.date}
        </DialogTitle>
        <div className="flex flex-col items-center gap-4 py-2">
          {/* Date */}
          <p className="text-sm text-text-muted">
            Daily #{entry.dayNumber} — {entry.date}
          </p>

          {/* Song info */}
          <div className="text-center">
            <p className="font-display text-lg font-bold">{entry.title}</p>
            <p className="text-sm text-text-secondary">{entry.artist}</p>
          </div>

          {/* Result */}
          <div className="flex items-center gap-2">
            {entry.isCorrect ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-accent-green" />
                <span className="text-sm font-medium text-accent-green">
                  {t('detail.phase', { phase: entry.phaseGuessed })}
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-accent-red" />
                <span className="text-sm font-medium text-accent-red">{t('detail.wrong')}</span>
              </>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
