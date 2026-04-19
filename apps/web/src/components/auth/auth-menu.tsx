'use client';

import { UserAvatar } from '@/components/auth/user-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { Link, useRouter } from '@/i18n/navigation';
import { LogOut, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

const MENU_TRIGGER_STYLE =
  'inline-flex items-center gap-2 rounded-full border border-bg-border bg-bg-surface py-1 pl-1 pr-3 text-sm transition-colors hover:border-accent-cyan focus:outline-none focus-visible:border-accent-cyan';

export function AuthMenu() {
  const t = useTranslations('auth.menu');
  const tProfile = useTranslations('profile');
  const { user, profile, guest, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (isLoading) {
    return <div className="h-10 w-24 animate-pulse rounded-md bg-bg-surface" aria-hidden="true" />;
  }

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
      toast.success(tProfile('signOutSuccess'));
      router.push('/');
      router.refresh();
    });
  }

  if (user) {
    const nickname =
      profile?.nickname ?? user.user_metadata.full_name ?? user.user_metadata.name ?? 'Player';
    const avatarSrc =
      profile?.avatarUrl ??
      (typeof user.user_metadata.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : undefined);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={MENU_TRIGGER_STYLE}
          aria-label={t('openMenu', { nickname })}
        >
          <UserAvatar nickname={nickname} src={avatarSrc} size="sm" />
          <span className="text-text-primary">{nickname}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className="h-4 w-4" aria-hidden="true" />
              <span>{t('profile')}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={handleSignOut} disabled={isPending}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{t('signOut')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (guest) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={MENU_TRIGGER_STYLE}
          aria-label={t('openMenu', { nickname: guest.nickname })}
        >
          <UserAvatar nickname={guest.nickname} size="sm" />
          <span className="text-text-secondary">
            <span className="mr-1 text-[0.65rem] uppercase tracking-wider text-text-muted">
              {t('guestLabel')}
            </span>
            <span className="text-text-primary">{guest.nickname}</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href="/login">
              <User className="h-4 w-4" aria-hidden="true" />
              <span>{t('signIn')}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={handleSignOut} disabled={isPending}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{t('endGuest')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button asChild variant="secondary" size="sm">
      <Link href="/login">{t('signIn')}</Link>
    </Button>
  );
}
