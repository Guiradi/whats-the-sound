'use client';

import { useAuth } from '@/hooks/use-auth';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export function GuestBanner() {
  const t = useTranslations('auth.banner');
  const { isGuest } = useAuth();

  if (!isGuest) return null;

  return (
    <div className="w-full border-b border-bg-border bg-bg-surface/60 px-6 py-2 text-center text-xs text-text-secondary">
      {t('guestCta')}{' '}
      <Link
        href="/login"
        className="font-semibold text-accent-cyan underline-offset-2 hover:underline"
      >
        {t('signIn')}
      </Link>
    </div>
  );
}
