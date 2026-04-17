import { AuthMenu } from '@/components/auth/auth-menu';
import { GuestBanner } from '@/components/auth/guest-banner';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { Headphones, Sparkles, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');

  return (
    <div className="flex min-h-screen flex-col">
      <GuestBanner />
      <header className="flex justify-end px-6 pt-6">
        <AuthMenu />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-6">
        <header className="flex flex-col items-center gap-4 text-center">
          <Badge variant="cyan">{t('sprintBadge')}</Badge>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight md:text-6xl">
            What's the Sound?
          </h1>
          <p className="max-w-md text-lg text-text-secondary">{t('heroTagline')}</p>
          <div className="flex gap-3">
            <Button variant="primary" size="lg">
              {tCommon('actions.playNow')}
            </Button>
            <Button variant="secondary" size="lg">
              {tCommon('actions.viewDaily')}
            </Button>
          </div>
        </header>

        <section className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Headphones className="h-6 w-6 text-accent-cyan" />
              <CardTitle>{t('cards.phases.title')}</CardTitle>
              <CardDescription>{t('cards.phases.description')}</CardDescription>
            </CardHeader>
            <CardContent>{t('cards.phases.body')}</CardContent>
          </Card>
          <Card highlight>
            <CardHeader>
              <Trophy className="h-6 w-6 text-accent-yellow" />
              <CardTitle>{t('cards.scoring.title')}</CardTitle>
              <CardDescription>{t('cards.scoring.description')}</CardDescription>
            </CardHeader>
            <CardContent>{t('cards.scoring.body')}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Sparkles className="h-6 w-6 text-accent-magenta" />
              <CardTitle>{t('cards.xp.title')}</CardTitle>
              <CardDescription>{t('cards.xp.description')}</CardDescription>
            </CardHeader>
            <CardContent>{t('cards.xp.body')}</CardContent>
          </Card>
        </section>

        <p className="text-xs text-text-muted">{t('placeholderNote')}</p>
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
