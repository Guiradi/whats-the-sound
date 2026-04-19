import { QuickStartForm } from '@/components/landing/quick-start-form';
import { useTranslations } from 'next-intl';

export function HeroSection() {
  const t = useTranslations('home');

  return (
    <section className="flex w-full flex-col items-center gap-8 px-6 py-16 text-center md:py-24">
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
          What&apos;s the Sound?
        </h1>
        <p className="max-w-lg text-xl text-text-secondary md:text-2xl">{t('heroTagline')}</p>
      </div>

      <QuickStartForm />
    </section>
  );
}
