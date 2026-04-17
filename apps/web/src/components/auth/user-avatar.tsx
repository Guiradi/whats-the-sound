import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  nickname: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
};

const FALLBACK_COLORS = [
  'bg-accent-cyan/20 text-accent-cyan',
  'bg-accent-magenta/20 text-accent-magenta',
  'bg-accent-yellow/20 text-accent-yellow',
  'bg-accent-green/20 text-accent-green',
  'bg-accent-orange/20 text-accent-orange',
] as const;

function hashColor(nickname: string): string {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = (hash * 31 + nickname.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[index] ?? FALLBACK_COLORS[0];
}

function initials(nickname: string): string {
  const trimmed = nickname.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/[\s_]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function UserAvatar({ nickname, src, size = 'md', className }: UserAvatarProps) {
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {src ? <AvatarImage src={src} alt={nickname} /> : null}
      <AvatarFallback className={cn('font-[family-name:var(--font-display)]', hashColor(nickname))}>
        {initials(nickname)}
      </AvatarFallback>
    </Avatar>
  );
}
