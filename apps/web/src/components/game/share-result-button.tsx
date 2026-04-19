'use client';

import { Button } from '@/components/ui/button';
import { APP_DISPLAY_URL } from '@/lib/app-url';
import type { RoomPlayer } from '@wts/shared';
import { Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';

interface ShareResultButtonProps {
  players: RoomPlayer[];
}

function buildShareText(players: RoomPlayer[]): string {
  const lines = ["What's the Sound? - Game Result", ''];
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);
  const medals = ['1st', '2nd', '3rd'];

  for (let i = 0; i < Math.min(sorted.length, 3); i++) {
    const p = sorted[i];
    if (p) {
      lines.push(`${medals[i]}: ${p.nickname} (${p.totalScore} pts)`);
    }
  }

  lines.push('', APP_DISPLAY_URL);
  return lines.join('\n');
}

export function ShareResultButton({ players }: ShareResultButtonProps) {
  const t = useTranslations('game.results');

  const handleShare = useCallback(async () => {
    const text = buildShareText(players);

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(text);
    toast.success(t('copied'));
  }, [players, t]);

  return (
    <Button variant="secondary" onClick={handleShare} className="gap-2">
      <Share2 className="h-4 w-4" />
      {t('share')}
    </Button>
  );
}
