import { DailyCard } from '@/components/home/daily-card';
import { GuestWelcomeBlock } from '@/components/home/guest-welcome-block';
import { MultiplayerCard } from '@/components/home/multiplayer-card';

interface GuestHomeDashboardProps {
  nickname: string;
}

export function GuestHomeDashboard({ nickname }: GuestHomeDashboardProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pb-10 pt-6 sm:px-6">
      <GuestWelcomeBlock nickname={nickname} />
      <DailyCard dailyStreak={0} />
      <MultiplayerCard />
    </div>
  );
}
