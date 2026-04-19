import { QuickStartForm } from '@/components/landing/quick-start-form';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function HeroSection() {
  const t = useTranslations('home');
  const tQuick = useTranslations('home.quickStart');

  return (
    <section className="flex w-full flex-col items-center gap-8 px-6 py-16 text-center md:py-24">
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
          What&apos;s the Sound?
        </h1>
        <p className="max-w-lg text-xl text-text-secondary md:text-2xl">{t('heroTagline')}</p>
      </div>

      <QuickStartForm />

      <Link
        href="/daily"
        className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-accent-cyan"
      >
        {tQuick('dailyLink')}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
