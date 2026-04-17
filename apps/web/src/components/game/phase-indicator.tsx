'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface PhaseIndicatorProps {
  currentPhase: 1 | 2 | 3 | 4 | null;
}

const PHASES = [1, 2, 3, 4] as const;

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const t = useTranslations('game');

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5">
        {PHASES.map((p) => (
          <div
            key={p}
            className={cn(
              'h-2.5 w-2.5 rounded-full transition-colors',
              currentPhase !== null && p < currentPhase && 'bg-text-muted',
              currentPhase === p && 'bg-accent-cyan shadow-[var(--shadow-glow-cyan)]',
              (currentPhase === null || p > currentPhase) &&
                'border border-bg-border bg-transparent',
            )}
          />
        ))}
      </div>
      {currentPhase && (
        <span className="text-xs text-text-muted">
          {t('phase.label', { current: currentPhase, total: 4 })}
        </span>
      )}
    </div>
  );
}
