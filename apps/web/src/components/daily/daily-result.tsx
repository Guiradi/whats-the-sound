'use client';

import { DailyCountdown } from '@/components/daily/daily-countdown';
import { PhaseAttempts } from '@/components/daily/phase-attempts';
import { ShareActions } from '@/components/daily/share-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DailyAttempt } from '@wts/shared';
import { CheckCircle2, Flame, History, Home, User, Users, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

interface DailyResultProps {
  dayNumber: number;
  attempts: DailyAttempt[];
  isCorrect: boolean;
  phaseGuessed: number | null;
  title: string | null;
  artist: string | null;
  currentStreak: number | null;
  isLoggedIn: boolean;
}

export function DailyResult({
  dayNumber,
  attempts,
  isCorrect,
  phaseGuessed,
  title,
  artist,
  currentStreak,
  isLoggedIn,
}: DailyResultProps) {
  const t = useTranslations('daily');
  const locale = useLocale();

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

      {/* Revealed song card */}
      {title && (
        <Card highlight>
          <CardContent className="py-4 text-center">
            <p className="font-display text-lg font-bold text-text-primary">{title}</p>
            {artist && <p className="text-sm text-text-secondary">{artist}</p>}
          </CardContent>
        </Card>
      )}

      {/* Streak badge — only for logged-in users with streak >= 1 */}
      {isLoggedIn && currentStreak !== null && currentStreak >= 1 && (
        <div className="flex items-center justify-center gap-2 rounded-md border border-bg-border bg-bg-surface px-4 py-2">
          <Flame className="h-5 w-5 text-accent-orange" />
          <span className="font-display text-sm font-semibold text-text-primary">
            {t('result.streak', { count: currentStreak })}
          </span>
        </div>
      )}

      {/* Phase attempts visualization */}
      <PhaseAttempts attempts={attempts} currentPhase={4} totalPhases={4} completed />

      {/* Share actions — multiple networks + copy + native */}
      <ShareActions
        dayNumber={dayNumber}
        isCorrect={isCorrect}
        phaseGuessed={phaseGuessed}
        attempts={attempts}
      />

      {/* Navigation actions — exits from the result screen */}
      <div className="flex flex-col gap-3">
        <p className="text-center text-sm font-medium text-text-secondary">
          {t('result.actions.title')}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {isLoggedIn && (
            <Button asChild variant="secondary" size="sm" className="gap-2">
              <Link href={`/${locale}/daily/history`}>
                <History className="h-4 w-4" />
                {t('result.actions.history')}
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary" size="sm" className="gap-2">
            <Link href={`/${locale}/rooms`}>
              <Users className="h-4 w-4" />
              {t('result.actions.multiplayer')}
            </Link>
          </Button>
          {isLoggedIn && (
            <Button asChild variant="secondary" size="sm" className="gap-2">
              <Link href={`/${locale}/profile`}>
                <User className="h-4 w-4" />
                {t('result.actions.profile')}
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary" size="sm" className="gap-2">
            <Link href={`/${locale}`}>
              <Home className="h-4 w-4" />
              {t('result.actions.home')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Countdown to next daily */}
      <div className="text-center">
        <p className="mb-2 text-sm text-text-muted">{t('nextDaily')}</p>
        <DailyCountdown />
      </div>
    </div>
  );
}
