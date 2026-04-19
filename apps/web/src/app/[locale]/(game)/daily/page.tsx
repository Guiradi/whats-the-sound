'use client';

import { LoginModal } from '@/components/auth/login-modal';
import { DailyChallenge } from '@/components/daily/daily-challenge';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function DailyPage() {
  const t = useTranslations('daily');
  const { user, guest, isLoading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const needsAuth = !authLoading && !user && !guest;

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (needsAuth) {
    return (
      <>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <p className="text-sm text-text-muted">{t('loginRequired')}</p>
          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="text-sm font-medium text-accent-cyan hover:underline"
          >
            {t('loginAction')}
          </button>
        </div>
        <LoginModal open={showLogin} onOpenChange={setShowLogin} next="/daily" />
      </>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <DailyChallenge />
    </div>
  );
}
