import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ArrowRight, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function MultiplayerCard() {
  const t = useTranslations('home.dashboard.multiplayer');

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-bg-border bg-bg-surface p-6">
      <div className="flex items-start gap-3">
        <Users className="mt-1 h-5 w-5 shrink-0 text-accent-magenta" aria-hidden="true" />
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">{t('title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('description')}</p>
        </div>
      </div>

      <Link href="/rooms" className="mt-auto">
        <Button variant="primary" className="w-full gap-2">
          {t('cta')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </section>
  );
}
