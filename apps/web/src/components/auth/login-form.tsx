'use client';

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

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.8V14.4h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.7s2.5-5.7 5.6-5.7c1.8 0 2.9.8 3.6 1.4l2.4-2.4C16.5 4.2 14.5 3.3 12 3.3 7.2 3.3 3.4 7.2 3.4 12s3.8 8.7 8.6 8.7c5 0 8.2-3.5 8.2-8.4 0-.6 0-1-.1-1.5H12z"
      />
      <path
        fill="#34A853"
        d="M12 10.8V14.4h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.7h-3C3.4 16.8 7.2 20.7 12 20.7c5 0 8.2-3.5 8.2-8.4 0-.6 0-1-.1-1.5H12z"
        opacity="0"
      />
    </svg>
  );
}

function DiscordMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#5865F2"
        d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.2.4c1.8.5 2.6 1.1 3.5 1.8a13.3 13.3 0 0 0-11.4 0C8.2 4.5 9 3.9 10.8 3.4L10.6 3a19.6 19.6 0 0 0-4.9 1.4C2.6 9 1.8 13.5 2.2 17.9a19.7 19.7 0 0 0 6 3.1l.6-.9a12.5 12.5 0 0 1-2-1l.4-.3a14 14 0 0 0 12 0l.4.3c-.6.4-1.3.7-2 1l.6.9a19.7 19.7 0 0 0 6-3.1c.5-5.2-.8-9.7-3.9-13.5zM8.5 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"
      />
    </svg>
  );
}
