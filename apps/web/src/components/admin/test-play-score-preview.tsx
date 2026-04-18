'use client';

import { cn } from '@/lib/utils';
import { GuessResult, PHASE_SCORES, calculateArtistScore, calculateTitleScore } from '@wts/shared';
import { useTranslations } from 'next-intl';

type Phase = 1 | 2 | 3 | 4;

export interface ScoreBreakdown {
  phase: Phase;
  position: number;
  titlePoints: number;
  artistPoints: number;
  total: number;
}

export function computeScoreBreakdown(
  firstSolvedPhase: Phase | null,
  position: number,
  hasArtistMatchBeforeTitle: boolean,
): ScoreBreakdown | null {
  if (firstSolvedPhase === null) return null;
  const titlePoints = calculateTitleScore(firstSolvedPhase, position, hasArtistMatchBeforeTitle);
  const artistPoints = hasArtistMatchBeforeTitle
    ? calculateArtistScore(firstSolvedPhase, position)
    : 0;
  return {
    phase: firstSolvedPhase,
    position,
    titlePoints,
    artistPoints,
    total: titlePoints + artistPoints,
  };
}

interface TestPlayScorePreviewProps {
  breakdown: ScoreBreakdown | null;
  className?: string;
}

export function TestPlayScorePreview({ breakdown, className }: TestPlayScorePreviewProps) {
  const t = useTranslations('adminCatalog.testPlay.scorePreview');

  return (
    <div className={cn('rounded-lg border border-accent-cyan/40 bg-accent-cyan/5 p-4', className)}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-accent-cyan">
        {t('heading')}
      </h3>

      {breakdown === null ? (
        <p className="mt-3 text-sm text-text-muted">{t('nothing')}</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-text-muted">{t('phase')}</dt>
            <dd className="text-right tabular-nums text-text-primary">{breakdown.phase}</dd>

            <dt className="text-text-muted">{t('position')}</dt>
            <dd className="text-right tabular-nums text-text-primary">{breakdown.position}</dd>

            <dt className="text-text-muted">{t('titlePoints')}</dt>
            <dd className="text-right tabular-nums text-text-primary">{breakdown.titlePoints}</dd>

            <dt className="text-text-muted">{t('artistPoints')}</dt>
            <dd className="text-right tabular-nums text-text-primary">{breakdown.artistPoints}</dd>

            <dt className="mt-1 border-t border-bg-border pt-2 text-sm font-semibold text-text-primary">
              {t('total')}
            </dt>
            <dd className="mt-1 border-t border-bg-border pt-2 text-right font-mono text-lg font-bold tabular-nums text-accent-cyan">
              {breakdown.total}
            </dd>
          </dl>
          <p className="mt-3 text-xs text-text-muted">
            {t('explain')} max={PHASE_SCORES[breakdown.phase].max} · decay=
            {PHASE_SCORES[breakdown.phase].decay} · floor={PHASE_SCORES[breakdown.phase].floor}
          </p>
        </>
      )}
    </div>
  );
}

export function feedbackToneClass(result: GuessResult): string {
  switch (result) {
    case GuessResult.CORRECT:
      return 'text-accent-green';
    case GuessResult.HOT:
      return 'text-accent-yellow';
    case GuessResult.WARM:
      return 'text-accent-cyan';
    case GuessResult.ARTIST_MATCH:
      return 'text-accent-magenta';
    default:
      return 'text-text-muted';
  }
}
