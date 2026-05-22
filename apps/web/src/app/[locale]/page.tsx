import { GuestBanner } from '@/components/auth/guest-banner';
import { GuestOrLanding } from '@/components/home/guest-or-landing';
import { HomeDashboard } from '@/components/home/home-dashboard';
import { FeatureHighlights } from '@/components/landing/feature-highlights';
import { HeroSection } from '@/components/landing/hero-section';
import { HowItWorks } from '@/components/landing/how-it-works';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { Link } from '@/i18n/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type HomeProfileRow, homeProfileRowSchema } from '@wts/shared';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

async function fetchHomeProfile(): Promise<HomeProfileRow | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('nickname, avatar_url, xp, level, login_streak, daily_streak')
    .eq('id', user.id)
    .maybeSingle();

  const parsed = homeProfileRowSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await fetchHomeProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <GuestBanner />

      <main className="flex flex-1 flex-col">
        {profile ? (
          <HomeDashboard
            nickname={profile.nickname}
            avatarUrl={profile.avatar_url}
            level={profile.level}
            xp={profile.xp}
            loginStreak={profile.login_streak}
            dailyStreak={profile.daily_streak}
          />
        ) : (
          <GuestOrLanding landing={<LandingContent />} />
        )}
      </main>

      <HomeFooter />
    </div>
  );
}

function LandingContent() {
  return (
    <div className="flex flex-1 flex-col items-center">
      <HeroSection />
      <HowItWorks />
      <FeatureHighlights />
    </div>
  );
}

function HomeFooter() {
  const tCommon = useTranslations('common');
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-6 py-6 text-xs text-text-muted">
      <Link href="/terms" className="transition-colors hover:text-accent-cyan">
        {tCommon('footer.terms')}
      </Link>
      <Link href="/privacy" className="transition-colors hover:text-accent-cyan">
        {tCommon('footer.privacy')}
      </Link>
      <LocaleSwitcher />
      <span className="text-text-muted/50">v1.0.0</span>
    </footer>
  );
}
