'use client';

import { DailyCountdown } from '@/components/daily/daily-countdown';
import { PhaseAttempts } from '@/components/daily/phase-attempts';
import { ShareButton } from '@/components/daily/share-button';
import { Card, CardContent } from '@/components/ui/card';
import type { DailyAttempt } from '@wts/shared';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DailyResultProps {
  dayNumber: number;
  attempts: DailyAttempt[];
  isCorrect: boolean;
  phaseGuessed: number | null;
  title: string | null;
  artist: string | null;
}

export function DailyResult({
  dayNumber,
  attempts,
  isCorrect,
  phaseGuessed,
  title,
  artist,
}: DailyResultProps) {
  const t = useTranslations('daily');

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4">
      {/* Result header */}
      <div className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          {isCorrect ? (
            <CheckCircle2 className="h-8 w-8 text-accent-green" />
          ) : (
            <XCircle className="h-8 w-8 text-accent-red" />
          )}
          <h1 className="font-display text-2xl font-bold">
            {isCorrect ? t('result.correct', { phase: phaseGuessed }) : t('result.wrong')}
          </h1>
        </div>
        <p className="text-sm text-text-muted">
          {t('title')} #{dayNumber}
        </p>
      </div>

      {/* Revealed song */}
      {title && (
        <Card highlight>
          <CardContent className="py-4 text-center">
            <p className="font-display text-lg font-bold text-text-primary">{title}</p>
            {artist && <p className="text-sm text-text-secondary">{artist}</p>}
          </CardContent>
        </Card>
      )}

      {/* Phase attempts visualization */}
      <PhaseAttempts attempts={attempts} currentPhase={4} totalPhases={4} completed />

      {/* Share button */}
      <ShareButton
        dayNumber={dayNumber}
        isCorrect={isCorrect}
        phaseGuessed={phaseGuessed}
        attempts={attempts}
      />

      {/* Countdown to next daily */}
      <div className="text-center">
        <p className="mb-2 text-sm text-text-muted">{t('nextDaily')}</p>
        <DailyCountdown />
      </div>
    </div>
  );
}
