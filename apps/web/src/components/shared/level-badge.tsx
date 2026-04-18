import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface LevelBadgeProps {
  level: number | null;
  size?: 'sm' | 'md';
  className?: string;
}

export function LevelBadge({ level, size = 'sm', className }: LevelBadgeProps) {
  const t = useTranslations('xp');

  const isGuest = level === null;

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-bold',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        isGuest && 'text-text-muted',
        !isGuest && level < 10 && 'text-text-muted',
        !isGuest && level >= 10 && level < 25 && 'text-accent-cyan',
        !isGuest && level >= 25 && level < 50 && 'text-accent-magenta',
        !isGuest &&
          level >= 50 &&
          'bg-gradient-to-r from-accent-yellow to-accent-magenta bg-clip-text text-transparent',
        className,
      )}
    >
      {isGuest ? `[${t('guest')}]` : `[${t('levelBadge', { level })}]`}
    </span>
  );
}
