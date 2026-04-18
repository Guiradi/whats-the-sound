'use client';

import { Button } from '@/components/ui/button';
import { GuessResult } from '@wts/shared';
import type { DailyAttempt } from '@wts/shared';
import { Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';

interface ShareButtonProps {
  dayNumber: number;
  isCorrect: boolean;
  phaseGuessed: number | null;
  attempts: DailyAttempt[];
}

function buildEmojiGrid(attempts: DailyAttempt[], totalPhases: number): string {
  const phases: string[] = [];
  for (let phase = 1; phase <= totalPhases; phase++) {
    const phaseAttempts = attempts.filter((a) => a.phase === phase);
    const hasCorrect = phaseAttempts.some((a) => a.result === GuessResult.CORRECT);
    const hasWrong = phaseAttempts.some(
      (a) =>
        a.result !== GuessResult.CORRECT &&
        a.result !== GuessResult.HOT &&
        a.result !== GuessResult.WARM,
    );

    if (hasCorrect) {
      phases.push('🟩✅');
    } else if (hasWrong) {
      phases.push('🟥❌');
    } else {
      phases.push('⬜—');
    }
  }
  return phases.join(' ');
}

export function ShareButton({ dayNumber, isCorrect, phaseGuessed, attempts }: ShareButtonProps) {
  const t = useTranslations('daily');

  const handleShare = useCallback(async () => {
    const grid = buildEmojiGrid(attempts, 4);
    const resultLine = isCorrect
      ? `🎵 ${t('share.correct', { phase: phaseGuessed })}`
      : `🎵 ${t('share.wrong')}`;

    const text = [
      `🔊 What's the Sound? #${dayNumber}`,
      resultLine,
      grid,
      'whatsthesound.io/daily',
    ].join('\n');

    // Try Web Share API first (mobile)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // User cancelled or API failed — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('share.copied'));
    } catch {
      toast.error(t('share.error'));
    }
  }, [dayNumber, isCorrect, phaseGuessed, attempts, t]);

  return (
    <Button onClick={handleShare} className="mx-auto gap-2">
      <Share2 className="h-4 w-4" />
      {t('share.button')}
    </Button>
  );
}
