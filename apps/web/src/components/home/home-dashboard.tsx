import { AchievementsCardCompact } from '@/components/home/achievements-card-compact';
import { DailyCard } from '@/components/home/daily-card';
import { InviteCardCompact } from '@/components/home/invite-card-compact';
import { MultiplayerCard } from '@/components/home/multiplayer-card';
import { WelcomeBlock } from '@/components/home/welcome-block';

interface HomeDashboardProps {
  nickname: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  loginStreak: number;
  dailyStreak: number;
}

export function HomeDashboard({
  nickname,
  avatarUrl,
  level,
  xp,
  loginStreak,
  dailyStreak,
}: HomeDashboardProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pb-10 pt-6 sm:px-6">
      <WelcomeBlock
        nickname={nickname}
        avatarUrl={avatarUrl}
        level={level}
        xp={xp}
        loginStreak={loginStreak}
      />
      <DailyCard dailyStreak={dailyStreak} />
      <div className="grid gap-5 md:grid-cols-2">
        <MultiplayerCard />
        <AchievementsCardCompact />
      </div>
      <InviteCardCompact />
    </div>
  );
}
