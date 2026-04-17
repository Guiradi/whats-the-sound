'use client';

import { cn } from '@/lib/utils';

interface GameTimerProps {
  timeRemaining: number;
  progress: number;
  color: 'cyan' | 'yellow' | 'red';
}

const COLOR_MAP = {
  cyan: 'bg-accent-cyan',
  yellow: 'bg-accent-yellow',
  red: 'bg-accent-red animate-[pulse-glow_1s_ease-in-out_infinite]',
} as const;

export function GameTimer({ timeRemaining, progress, color }: GameTimerProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-bg-surface-hover">
        <div
          className={cn('h-full rounded-full transition-all duration-200', COLOR_MAP[color])}
          style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
        />
      </div>
      <span
        className={cn(
          'min-w-[3ch] text-right font-mono text-sm font-bold tabular-nums',
          color === 'red' ? 'text-accent-red' : 'text-text-primary',
        )}
      >
        {Math.ceil(timeRemaining)}
      </span>
    </div>
  );
}
