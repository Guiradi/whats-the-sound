import { UserAvatar } from '@/components/auth/user-avatar';
import { NicknameInput } from '@/components/profile/nickname-input';
import { useFormatter, useTranslations } from 'next-intl';

interface ProfileCardProps {
  nickname: string;
  avatarUrl: string | null;
  createdAt: string;
}

export function ProfileCard({ nickname, avatarUrl, createdAt }: ProfileCardProps) {
  const t = useTranslations('profile');
  const format = useFormatter();
  const memberSinceDate = format.dateTime(new Date(createdAt), {
    year: 'numeric',
    month: 'long',
  });

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-bg-border bg-bg-surface p-6 sm:flex-row sm:items-start">
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <UserAvatar nickname={nickname} src={avatarUrl} size="lg" />
        <p className="text-xs text-text-muted">{t('memberSince', { date: memberSinceDate })}</p>
      </div>
      <div className="flex-1">
        <NicknameInput initialNickname={nickname} />
      </div>
    </section>
  );
}
