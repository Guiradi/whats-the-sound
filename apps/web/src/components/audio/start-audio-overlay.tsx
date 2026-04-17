'use client';

import { useAudioContext } from '@/lib/midi/audio-context';
import { cn } from '@/lib/utils';
import { Headphones } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function StartAudioOverlay() {
  const { isReady, isStarting, error, start } = useAudioContext();
  const t = useTranslations('audio.overlay');

  if (isReady) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => {
          void start();
        }}
        disabled={isStarting}
        className={cn(
          'flex flex-col items-center gap-4 rounded-xl border border-bg-border bg-bg-surface px-10 py-8 text-center transition-all',
          'hover:border-accent-cyan hover:shadow-[var(--shadow-glow-cyan)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan',
          'disabled:opacity-70',
        )}
      >
        <Headphones className="h-10 w-10 text-accent-cyan" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
            {isStarting ? t('starting') : t('title')}
          </span>
          <span className="max-w-sm text-sm text-text-secondary">{t('subtitle')}</span>
        </div>
        {error ? <span className="text-xs text-accent-red">{t('error')}</span> : null}
      </button>
    </div>
  );
}
