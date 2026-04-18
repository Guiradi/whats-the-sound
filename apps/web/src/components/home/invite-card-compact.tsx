'use client';

import { Button } from '@/components/ui/button';
import { env } from '@/env';
import { useAuth } from '@/hooks/use-auth';
import { Copy, Share2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ReferralData {
  code: string | null;
  invitedCount: number;
  completedCount: number;
  pendingCount: number;
  rewardPerReferral: number;
}

function buildInviteUrl(code: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
}

export function InviteCardCompact() {
  const t = useTranslations('home.dashboard.invite');
  const tProfile = useTranslations('profile.invite');
  const { user, isGuest } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);

  useEffect(() => {
    if (!user || isGuest) return;
    let cancelled = false;
    fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/me/referrals`, {
      headers: { 'x-user-id': user.id },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body) setData(body as ReferralData);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, isGuest]);

  if (!user || isGuest || !data?.code) return null;

  const inviteUrl = buildInviteUrl(data.code);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(tProfile('copied'));
    } catch {
      toast.error(tProfile('copyError'));
    }
  };

  const handleShare = async () => {
    const shareText = `${tProfile('shareText')} ${inviteUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: tProfile('shareSubject'),
          text: shareText,
          url: inviteUrl,
        });
        return;
      } catch {
        // Fall back to copy.
      }
    }
    handleCopy();
  };

  const counterText =
    data.invitedCount === 0
      ? t('noneYet')
      : t('counter', { completed: data.completedCount, invited: data.invitedCount });

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-bg-border bg-bg-surface p-6">
      <div className="flex items-start gap-3">
        <Users className="mt-1 h-5 w-5 shrink-0 text-accent-magenta" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold text-text-primary">{t('title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {t('description', { amount: data.rewardPerReferral })}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={handleCopy} className="flex-1">
          <Copy className="h-4 w-4" aria-hidden="true" />
          {tProfile('copy')}
        </Button>
        <Button type="button" variant="primary" onClick={handleShare} className="flex-1">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {tProfile('shareSubject')}
        </Button>
      </div>

      <p className="text-sm text-text-secondary">{counterText}</p>
    </section>
  );
}
