'use client';

import { feedbackToneClass } from '@/components/admin/test-play-score-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GuessResult } from '@wts/shared';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';

type Phase = 1 | 2 | 3 | 4;

export interface GuessAttempt {
  id: number;
  phase: Phase;
  text: string;
  result: GuessResult;
  matchedCandidate: string | null;
  at: number;
}

interface TestPlayGuessPanelProps {
  phase: Phase;
  attempts: GuessAttempt[];
  onSubmit: (text: string) => void;
  disabled: boolean;
  autoFocus?: boolean;
}

export function TestPlayGuessPanel({
  phase,
  attempts,
  onSubmit,
  disabled,
  autoFocus,
}: TestPlayGuessPanelProps) {
  const t = useTranslations('adminCatalog.testPlay');
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  const attemptsForPhase = attempts.filter((a) => a.phase === phase);

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('guessPlaceholder')}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          className="flex-1"
        />
        <Button type="submit" variant="primary" size="md" disabled={disabled || !value.trim()}>
          {t('submitGuess')}
        </Button>
      </form>

      <div className="rounded-md border border-bg-border bg-bg-surface">
        <h4 className="border-b border-bg-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          {t('attempts')}
        </h4>
        {attemptsForPhase.length === 0 ? (
          <p className="px-3 py-3 text-xs text-text-muted">{t('attemptEmpty')}</p>
        ) : (
          <ul className="divide-y divide-bg-border">
            {attemptsForPhase.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                <span
                  className={cn(
                    'min-w-[72px] font-mono text-xs font-semibold uppercase tracking-wider',
                    feedbackToneClass(a.result),
                  )}
                >
                  {a.result}
                </span>
                <div className="flex flex-1 flex-col">
                  <span className="text-text-primary">{a.text}</span>
                  {a.matchedCandidate && (
                    <span className="text-xs text-text-muted">→ {a.matchedCandidate}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
