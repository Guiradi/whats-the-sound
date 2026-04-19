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

interface LoginFormProps {
  next?: string;
  onGuestLogin?: () => void;
  onOAuthStart?: () => void;
}

export function LoginForm({ next, onGuestLogin, onOAuthStart }: LoginFormProps) {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const { signInWithGoogle, signInWithDiscord, guestLogin } = useAuth();
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<'google' | 'discord' | null>(null);

  async function handleProvider(provider: 'google' | 'discord') {
    setIsSubmitting(provider);
    onOAuthStart?.();
    try {
      if (provider === 'google') await signInWithGoogle(next);
      else await signInWithDiscord(next);
      // Browser redirects away; nothing else to do.
    } catch {
      toast.error(t('error'));
      setIsSubmitting(null);
    }
  }

  function handleGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setNicknameError(t('guest.empty'));
      return;
    }
    if (!isValidNickname(trimmed)) {
      setNicknameError(t('guest.invalid'));
      return;
    }
    setNicknameError(null);
    guestLogin(trimmed);
    onGuestLogin?.();
    router.push(next ?? '/');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          size="lg"
          type="button"
          disabled={isSubmitting !== null}
          onClick={() => handleProvider('google')}
        >
          <GoogleMark />
          {t('providers.google')}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          type="button"
          disabled={isSubmitting !== null}
          onClick={() => handleProvider('discord')}
        >
          <DiscordMark />
          {t('providers.discord')}
        </Button>
      </div>

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-text-muted">
        <span className="h-px flex-1 bg-bg-border" />
        {t('divider')}
        <span className="h-px flex-1 bg-bg-border" />
      </div>

      <form className="flex flex-col gap-2" onSubmit={handleGuest} noValidate>
        <label htmlFor="guest-nickname" className="text-sm font-medium text-text-secondary">
          {t('guest.label')}
        </label>
        <Input
          id="guest-nickname"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            if (nicknameError) setNicknameError(null);
          }}
          placeholder={t('guest.placeholder')}
          maxLength={20}
          autoComplete="off"
          hasError={nicknameError !== null}
          aria-invalid={nicknameError !== null}
          aria-describedby="guest-nickname-helper"
        />
        <p
          id="guest-nickname-helper"
          className={nicknameError ? 'text-xs text-accent-red' : 'text-xs text-text-muted'}
        >
          {nicknameError ?? t('guest.helper')}
        </p>
        <Button variant="primary" size="lg" type="submit" className="mt-1">
          {t('guest.submit')}
        </Button>
      </form>
    </div>
  );
}
