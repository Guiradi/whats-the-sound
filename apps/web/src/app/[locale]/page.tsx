import { AuthMenu } from '@/components/auth/auth-menu';
import { GuestBanner } from '@/components/auth/guest-banner';
import { FeatureHighlights } from '@/components/landing/feature-highlights';
import { HeroSection } from '@/components/landing/hero-section';
import { HowItWorks } from '@/components/landing/how-it-works';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const tCommon = useTranslations('common');

  return (
    <div className="flex min-h-screen flex-col">
      <GuestBanner />
      <header className="flex justify-end px-6 pt-6">
        <AuthMenu />
      </header>

      <main className="flex flex-1 flex-col items-center">
        <HeroSection />
        <HowItWorks />
        <FeatureHighlights />
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-6 py-6 text-xs text-text-muted">
        <Link href="/terms" className="transition-colors hover:text-accent-cyan">
          {tCommon('footer.terms')}
        </Link>
        <Link href="/privacy" className="transition-colors hover:text-accent-cyan">
          {tCommon('footer.privacy')}
        </Link>
        <LocaleSwitcher />
      </footer>
    </div>
  );
}
