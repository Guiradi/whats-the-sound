'use client';

import confetti from 'canvas-confetti';
import { Music } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

interface RoundRevealProps {
  title: string;
  artist: string;
  correctPlayerIds: string[];
  playerNames: Map<string, string>;
}

export function RoundReveal({ title, artist, correctPlayerIds, playerNames }: RoundRevealProps) {
  const t = useTranslations('game');
  const fired = useRef(false);

  useEffect(() => {
    if (!fired.current && correctPlayerIds.length > 0) {
      fired.current = true;
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ff00aa', '#ffcc00'],
      });
    }
  }, [correctPlayerIds.length]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-bg-primary/90 backdrop-blur-sm">
      <Music className="mb-4 h-12 w-12 text-accent-magenta" />
      <h2 className="mb-1 font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-text-primary">
        {title}
      </h2>
      <p className="mb-6 text-lg text-text-secondary">{artist}</p>

      {correctPlayerIds.length > 0 ? (
        <div className="text-center">
          <p className="mb-2 text-sm text-text-muted">{t('reveal.correctPlayers')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {correctPlayerIds.map((id) => (
              <span
                key={id}
                className="rounded-full bg-accent-green/20 px-3 py-1 text-sm font-semibold text-accent-green"
              >
                {playerNames.get(id) ?? id}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted">{t('reveal.noOneGuessed')}</p>
      )}
    </div>
  );
}
