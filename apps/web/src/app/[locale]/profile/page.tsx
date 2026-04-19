import { AchievementsCard } from '@/components/profile/achievements-card';
import { GuestEmptyState } from '@/components/profile/guest-empty-state';
import { InviteCard } from '@/components/profile/invite-card';
import { ProfileCard } from '@/components/profile/profile-card';
import { StatGrid } from '@/components/profile/stat-grid';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type ProfileRow, profileRowSchema } from '@wts/shared';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const PROFILE_COLUMNS =
  'nickname, avatar_url, created_at, total_games, total_wins, total_correct, daily_streak, max_daily_streak, points_total, level, xp, login_streak, max_login_streak';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: t('profileTitle'),
    description: t('profileDescription'),
  };
}

async function fetchProfile(): Promise<ProfileRow | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle();

  const parsed = profileRowSchema.safeParse(data);
  if (parsed.success) return parsed.data;

  const meta = user.user_metadata ?? {};
  const rawName = (meta.name ?? meta.full_name ?? meta.preferred_username ?? '') as string;
  const sanitized = rawName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  const nickname =
    sanitized.length >= 3 ? sanitized : `player_${user.id.replace(/-/g, '').slice(0, 8)}`;

  const referralCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  const { data: created } = await supabase
    .from('users')
    .insert({
      id: user.id,
      email: user.email ?? '',
      nickname,
      avatar_url: (meta.avatar_url ?? meta.picture ?? null) as string | null,
      referral_code: referralCode,
    })
    .select(PROFILE_COLUMNS)
    .single();

  const parsedCreated = profileRowSchema.safeParse(created);
  return parsedCreated.success ? parsedCreated.data : null;
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'profile' });
  const profile = await fetchProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center px-6 py-4 lg:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-accent-cyan"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('guestEmpty.backToHome')}
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
        {profile ? (
          <div className="flex flex-col gap-8">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary">
              {t('heading')}
            </h1>
            <ProfileCard
              nickname={profile.nickname}
              avatarUrl={profile.avatar_url}
              createdAt={profile.created_at}
            />
            <StatGrid stats={profile} locale={locale} />
            <AchievementsCard />
            <InviteCard />
          </div>
        ) : (
          <GuestEmptyState />
        )}
      </main>
    </div>
  );
}
