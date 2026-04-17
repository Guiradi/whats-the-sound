'use client';

import { UserAvatar } from '@/components/auth/user-avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export function AuthMenu() {
  const t = useTranslations('auth.menu');
  const { user, profile, guest, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-10 w-24 animate-pulse rounded-md bg-bg-surface" aria-hidden="true" />;
  }

  if (user) {
    const nickname = profile?.nickname ?? user.user_metadata.full_name ?? user.user_metadata.name ?? 'Player';
    const avatarSrc = profile?.avatarUrl ?? (typeof user.user_metadata.avatar_url === 'string' ? user.user_metadata.avatar_url : undefined);
    return (
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 rounded-full border border-bg-border bg-bg-surface py-1 pl-1 pr-3 text-sm transition-colors hover:border-accent-cyan"
        aria-label={t('viewProfile', { nickname })}
      >
        <UserAvatar nickname={nickname} src={avatarSrc} size="sm" />
        <span className="text-text-primary">{nickname}</span>
      </Link>
    );
  }

  if (guest) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-bg-border bg-bg-surface py-1 pl-1 pr-3 text-sm">
          <UserAvatar nickname={guest.nickname} size="sm" />
          <span className="text-text-secondary">
            <span className="mr-1 text-[0.65rem] uppercase tracking-wider text-text-muted">
              {t('guestLabel')}
            </span>
            <span className="text-text-primary">{guest.nickname}</span>
          </span>
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">{t('signIn')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <Button asChild variant="secondary" size="sm">
      <Link href="/login">{t('signIn')}</Link>
    </Button>
  );
}
