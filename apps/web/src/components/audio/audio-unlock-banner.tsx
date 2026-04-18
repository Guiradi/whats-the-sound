'use client';

import { useAudioContext } from '@/lib/midi/audio-context';
import { cn } from '@/lib/utils';
import { CheckCircle, Headphones, Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Non-blocking banner shown in the lobby so players unlock audio
 * before the game starts. Once audio is ready, shows a green confirmation.
 */
export function AudioUnlockBanner() {
  const { isReady, isStarting, error, start } = useAudioContext();
  const t = useTranslations('audio.banner');

  if (isReady) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-3">
        <CheckCircle className="h-4 w-4 text-accent-green" />
        <span className="text-sm font-medium text-accent-green">{t('ready')}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        void start();
      }}
      disabled={isStarting}
      className={cn(
        'flex w-full items-center justify-center gap-3 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-3 transition-all',
        'hover:border-accent-cyan hover:bg-accent-cyan/20',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan',
        'disabled:opacity-70',
      )}
    >
      {isStarting ? (
        <Volume2 className="h-5 w-5 animate-pulse text-accent-cyan" />
      ) : (
        <Headphones className="h-5 w-5 text-accent-cyan" />
      )}
      <span className="text-sm font-medium text-text-primary">
        {isStarting ? t('starting') : t('tapToUnlock')}
      </span>
      {error && <span className="text-xs text-accent-red">{t('error')}</span>}
    </button>
  );
}
