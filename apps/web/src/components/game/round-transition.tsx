'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface RoundTransitionProps {
  roundNumber: number;
  totalRounds: number;
}

export function RoundTransition({ roundNumber, totalRounds }: RoundTransitionProps) {
  const t = useTranslations('game');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-bg-primary/90 backdrop-blur-sm">
      <p className="mb-2 text-sm text-text-muted">
        {t('round.label', { current: roundNumber, total: totalRounds })}
      </p>
      {countdown > 0 ? (
        <span
          key={countdown}
          className="animate-[scale-pop_0.5s_ease-out] font-[family-name:var(--font-space-grotesk)] text-8xl font-bold text-accent-cyan"
        >
          {countdown}
        </span>
      ) : (
        <span className="animate-[scale-pop_0.3s_ease-out] font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-accent-cyan">
          {t('round.go')}
        </span>
      )}
    </div>
  );
}
