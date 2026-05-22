import { UserAvatar } from '@/components/auth/user-avatar';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

interface GuestWelcomeBlockProps {
  nickname: string;
}

export function GuestWelcomeBlock({ nickname }: GuestWelcomeBlockProps) {
  const t = useTranslations('home.dashboard.welcome');
  const tGuest = useTranslations('home.dashboard.guestWelcome');

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-bg-border bg-bg-surface p-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-3">
        <UserAvatar nickname={nickname} size="md" />
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-text-muted">{t('greeting')}</span>
          <span className="font-display text-xl font-semibold text-text-primary">{nickname}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 sm:items-end">
        <p className="text-sm text-text-secondary">{tGuest('hint')}</p>
        <Link
          href="/login"
          className="text-sm font-semibold text-accent-cyan underline-offset-2 hover:underline"
        >
          {tGuest('cta')}
        </Link>
      </div>
    </section>
  );
}
