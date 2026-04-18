'use client';

import { Button } from '@/components/ui/button';
import { GuessResult } from '@wts/shared';
import type { DailyAttempt } from '@wts/shared';
import { Copy, MessageCircle, Send, Share2, Twitter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ShareActionsProps {
  dayNumber: number;
  isCorrect: boolean;
  phaseGuessed: number | null;
  attempts: DailyAttempt[];
}

const DAILY_URL = 'https://whatsthesound.io/daily';

/**
 * Wordle-style emoji grid (spoiler-free — never includes song title).
 * 🟩✅ = phase attempted and correct
 * 🟥❌ = phase attempted and wrong
 * ⬜— = phase not attempted (already won earlier)
 */
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

export function ShareActions({ dayNumber, isCorrect, phaseGuessed, attempts }: ShareActionsProps) {
  const t = useTranslations('daily');
  const [canShareNative, setCanShareNative] = useState(false);

  // Feature-detect Web Share API on the client (avoids SSR mismatch)
  useEffect(() => {
    setCanShareNative(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const shareText = (() => {
    const grid = buildEmojiGrid(attempts, 4);
    const resultLine = isCorrect
      ? `🎵 ${t('share.correct', { phase: phaseGuessed ?? 1 })}`
      : `🎵 ${t('share.wrong')}`;
    return [`🔊 What's the Sound? #${dayNumber}`, resultLine, grid, DAILY_URL].join('\n');
  })();

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ text: shareText });
    } catch {
      // User cancelled or share failed — silent (native dialogs handle UX)
    }
  }, [shareText]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success(t('share.copied'));
    } catch {
      toast.error(t('share.error'));
    }
  }, [shareText, t]);

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(DAILY_URL)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm font-medium text-text-secondary">{t('share.title')}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button asChild variant="secondary" size="sm" className="gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('share.whatsapp')}
          >
            <MessageCircle className="h-4 w-4" />
            {t('share.whatsapp')}
          </a>
        </Button>
        <Button asChild variant="secondary" size="sm" className="gap-2">
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('share.twitter')}
          >
            <Twitter className="h-4 w-4" />
            {t('share.twitter')}
          </a>
        </Button>
        <Button asChild variant="secondary" size="sm" className="gap-2">
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('share.telegram')}
          >
            <Send className="h-4 w-4" />
            {t('share.telegram')}
          </a>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
          aria-label={t('share.copy')}
        >
          <Copy className="h-4 w-4" />
          {t('share.copy')}
        </Button>
      </div>
      {canShareNative && (
        <Button
          onClick={handleNativeShare}
          className="mx-auto gap-2"
          aria-label={t('share.native')}
        >
          <Share2 className="h-4 w-4" />
          {t('share.native')}
        </Button>
      )}
    </div>
  );
}
