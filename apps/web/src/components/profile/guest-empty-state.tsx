import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function GuestEmptyState() {
  const t = useTranslations('profile.guestEmpty');
  return (
    <div className="flex flex-col items-center gap-6 rounded-xl border border-bg-border bg-bg-surface p-10 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-text-primary">
          {t('title')}
        </h1>
        <p className="max-w-md text-sm text-text-secondary">{t('description')}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="primary" size="lg">
          <Link href="/login">
            <LogIn className="h-4 w-4" />
            {t('signIn')}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            {t('backToHome')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
