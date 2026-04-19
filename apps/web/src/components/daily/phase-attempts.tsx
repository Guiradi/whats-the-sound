'use client';

import { cn } from '@/lib/utils';
import { GuessResult } from '@wts/shared';
import type { DailyAttempt } from '@wts/shared';
import { useTranslations } from 'next-intl';

interface PhaseAttemptsProps {
  attempts: DailyAttempt[];
  currentPhase: number;
  totalPhases: number;
  completed?: boolean;
}

export function PhaseAttempts({
  attempts,
  currentPhase,
  totalPhases,
  completed = false,
}: PhaseAttemptsProps) {
  const t = useTranslations('daily');

  // Group attempts by phase, find decisive attempt per phase
  function getPhaseStatus(phase: number): 'correct' | 'wrong' | 'skipped' | 'active' | 'upcoming' {
    const phaseAttempts = attempts.filter((a) => a.phase === phase);
    const hasCorrect = phaseAttempts.some((a) => a.result === GuessResult.CORRECT);
    const hasSkip = phaseAttempts.some((a) => a.skipped === true);
    const hasWrongConsumingAttempt = phaseAttempts.some(
      (a) =>
        a.result !== GuessResult.CORRECT &&
        a.result !== GuessResult.HOT &&
        a.result !== GuessResult.WARM,
    );

    if (hasCorrect) return 'correct';
    if (hasSkip && !hasCorrect) return 'skipped';
    if (hasWrongConsumingAttempt) return 'wrong';
    if (phase === currentPhase && !completed) return 'active';
    if (phase < currentPhase || completed) return 'wrong';
    return 'upcoming';
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: totalPhases }, (_, i) => {
        const phase = i + 1;
        const status = getPhaseStatus(phase);

        return (
          <div key={phase} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold transition-all',
                status === 'correct' &&
                  'bg-accent-green/20 text-accent-green ring-1 ring-accent-green/40',
                status === 'wrong' && 'bg-accent-red/20 text-accent-red ring-1 ring-accent-red/40',
                status === 'skipped' &&
                  'bg-text-muted/10 text-text-muted ring-1 ring-text-muted/30',
                status === 'active' &&
                  'bg-accent-cyan/20 text-accent-cyan ring-2 ring-accent-cyan/60 shadow-[var(--shadow-glow-cyan)]',
                status === 'upcoming' && 'bg-bg-surface text-text-muted ring-1 ring-bg-border',
              )}
            >
              {status === 'correct'
                ? '✓'
                : status === 'skipped'
                  ? '»'
                  : status === 'wrong'
                    ? '✗'
                    : phase}
            </div>
            <span className="text-xs text-text-muted">{t('phaseLabel', { n: phase })}</span>
          </div>
        );
      })}
    </div>
  );
}
