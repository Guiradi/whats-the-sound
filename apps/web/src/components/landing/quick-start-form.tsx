'use client';

import { DiscordMark, GoogleMark } from '@/components/auth/provider-marks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from '@/i18n/navigation';
import { isValidNickname } from '@/lib/auth/guest';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

export function QuickStartForm() {
  const tAuth = useTranslations('auth.login');
  const tQuick = useTranslations('home.quickStart');
  const router = useRouter();
  const { signInWithGoogle, signInWithDiscord, guestLogin } = useAuth();
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<'google' | 'discord' | null>(null);

  async function handleProvider(provider: 'google' | 'discord') {
    setIsSubmitting(provider);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithDiscord();
    } catch {
      toast.error(tAuth('error'));
      setIsSubmitting(null);
    }
  }

  function handleGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setNicknameError(tAuth('guest.empty'));
      return;
    }
    if (!isValidNickname(trimmed)) {
      setNicknameError(tAuth('guest.invalid'));
      return;
    }
    setNicknameError(null);
    guestLogin(trimmed);
    router.push('/rooms');
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <form onSubmit={handleGuest} noValidate className="flex flex-col gap-2">
        <label htmlFor="quickstart-nickname" className="sr-only">
          {tAuth('guest.label')}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="quickstart-nickname"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              if (nicknameError) setNicknameError(null);
            }}
            placeholder={tAuth('guest.placeholder')}
            maxLength={20}
            autoComplete="off"
            hasError={nicknameError !== null}
            aria-invalid={nicknameError !== null}
            aria-describedby="quickstart-nickname-helper"
            className="h-12 text-base sm:flex-1"
          />
          <Button variant="primary" size="lg" type="submit" disabled={isSubmitting !== null}>
            {tQuick('submit')}
          </Button>
        </div>
        <p
          id="quickstart-nickname-helper"
          className={
            nicknameError
              ? 'text-left text-xs text-accent-red'
              : 'text-left text-xs text-text-muted'
          }
        >
          {nicknameError ?? tAuth('guest.helper')}
        </p>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-text-muted">
        <span className="h-px flex-1 bg-bg-border" />
        {tQuick('divider')}
        <span className="h-px flex-1 bg-bg-border" />
      </div>

      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
        <Button
          variant="secondary"
          size="lg"
          type="button"
          disabled={isSubmitting !== null}
          onClick={() => handleProvider('google')}
        >
          <GoogleMark />
          {tAuth('providers.google')}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          type="button"
          disabled={isSubmitting !== null}
          onClick={() => handleProvider('discord')}
        >
          <DiscordMark />
          {tAuth('providers.discord')}
        </Button>
      </div>
    </div>
  );
}
