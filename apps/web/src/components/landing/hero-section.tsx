import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Music, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function HeroSection() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');

  return (
    <section className="flex flex-col items-center gap-6 px-6 py-16 text-center md:py-24">
      <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
        What&apos;s the Sound?
      </h1>
      <p className="max-w-lg text-xl text-text-secondary md:text-2xl">{t('heroTagline')}</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/rooms">
          <Button variant="primary" size="lg" className="gap-2">
            <Users className="h-5 w-5" />
            {tCommon('actions.playNow')}
          </Button>
        </Link>
        <Link href="/daily">
          <Button variant="secondary" size="lg" className="gap-2">
            <Music className="h-5 w-5" />
            {tCommon('actions.viewDaily')}
          </Button>
        </Link>
      </div>
    </section>
  );
}
