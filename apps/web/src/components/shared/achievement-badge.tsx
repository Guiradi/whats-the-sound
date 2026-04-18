import { cn } from '@/lib/utils';
import type { AchievementTier } from '@wts/shared';
import {
  CalendarCheck,
  DoorOpen,
  Ear,
  Flame,
  Headphones,
  Lock,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const ICON_MAP: Record<string, IconComponent> = {
  DoorOpen,
  Flame,
  Headphones,
  CalendarCheck,
  Ear,
  Trophy,
  UserPlus,
  Users,
};

const TIER_ACCENT: Record<AchievementTier, string> = {
  bronze: 'text-accent-orange border-accent-orange/50',
  silver: 'text-accent-cyan border-accent-cyan/50',
  gold: 'text-accent-yellow border-accent-yellow/60',
};

const TIER_GLOW: Record<AchievementTier, string> = {
  bronze: 'shadow-[0_0_12px_rgba(255,136,0,0.35)]',
  silver: 'shadow-[0_0_12px_rgba(0,240,255,0.35)]',
  gold: 'shadow-[0_0_16px_rgba(255,215,0,0.45)]',
};

export interface AchievementBadgeProps {
  iconName: string;
  tier: AchievementTier;
  unlocked: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AchievementBadge({
  iconName,
  tier,
  unlocked,
  size = 'md',
  className,
}: AchievementBadgeProps) {
  const Icon = unlocked ? (ICON_MAP[iconName] ?? Trophy) : Lock;

  const sizeClass = size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-20 w-20' : 'h-14 w-14';

  const iconSizeClass = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-10 w-10' : 'h-7 w-7';

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border-2 bg-bg-surface transition',
        sizeClass,
        unlocked ? TIER_ACCENT[tier] : 'text-text-muted border-bg-border opacity-60',
        unlocked ? TIER_GLOW[tier] : '',
        className,
      )}
    >
      <Icon className={iconSizeClass} aria-hidden="true" />
    </div>
  );
}
