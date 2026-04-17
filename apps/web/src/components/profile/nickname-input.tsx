'use client';

import { checkNicknameAvailability, updateNickname } from '@/app/[locale]/profile/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from '@/i18n/navigation';
import { isValidNickname } from '@/lib/auth/guest';
import { isBlockedNickname } from '@/lib/auth/profanity';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';

type Status =
  | 'idle'
  | 'unchanged'
  | 'invalid'
  | 'profanity'
  | 'checking'
  | 'available'
  | 'taken'
  | 'saving';

const helperMessageKey: Partial<Record<Status, string>> = {
  invalid: 'invalid',
  profanity: 'profanity',
  checking: 'checking',
  available: 'available',
  taken: 'taken',
  unchanged: 'unchanged',
};

const helperToneClass: Partial<Record<Status, string>> = {
  invalid: 'text-accent-red',
  profanity: 'text-accent-red',
  taken: 'text-accent-red',
  available: 'text-accent-green',
  checking: 'text-text-muted',
  unchanged: 'text-text-muted',
};

export function NicknameInput({ initialNickname }: { initialNickname: string }) {
  const t = useTranslations('profile.nickname');
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const inputId = useId();
  const helperId = useId();
  const [value, setValue] = useState(initialNickname);
  const [committed, setCommitted] = useState(initialNickname);
  const [status, setStatus] = useState<Status>('unchanged');
  const debounceRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearDebounce;
  }, [clearDebounce]);

  useEffect(() => {
    const trimmed = value.trim();
    clearDebounce();

    if (trimmed === committed) {
      setStatus('unchanged');
      return;
    }
    if (trimmed.length === 0) {
      setStatus('idle');
      return;
    }
    if (!isValidNickname(trimmed)) {
      setStatus('invalid');
      return;
    }
    if (isBlockedNickname(trimmed)) {
      setStatus('profanity');
      return;
    }

    setStatus('checking');
    const currentRequestId = ++requestIdRef.current;
    debounceRef.current = window.setTimeout(() => {
      checkNicknameAvailability(trimmed)
        .then((result) => {
          if (currentRequestId !== requestIdRef.current) return;
          setStatus(result.status);
        })
        .catch(() => {
          if (currentRequestId !== requestIdRef.current) return;
          setStatus('idle');
        });
    }, 500);
  }, [value, committed, clearDebounce]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== 'available') return;

    const trimmed = value.trim();
    setStatus('saving');
    const result = await updateNickname(trimmed);
    if (result.ok) {
      setCommitted(result.nickname);
      setValue(result.nickname);
      setStatus('unchanged');
      toast.success(t('saved'));
      await refreshProfile();
      router.refresh();
      return;
    }

    switch (result.reason) {
      case 'invalid':
        setStatus('invalid');
        break;
      case 'profanity':
        setStatus('profanity');
        break;
      case 'taken':
        setStatus('taken');
        break;
      default:
        setStatus('idle');
        toast.error(t('saveError'));
    }
  }

  function handleCancel() {
    setValue(committed);
    setStatus('unchanged');
  }

  const helperMessage =
    status === 'saving'
      ? t('saving')
      : helperMessageKey[status]
        ? t(helperMessageKey[status])
        : t('helper');
  const helperClass = helperToneClass[status] ?? 'text-text-muted';
  const hasError = status === 'invalid' || status === 'profanity' || status === 'taken';
  const canSave = status === 'available';
  const isDirty = value.trim() !== committed;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
      <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
        {t('label')}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={20}
          autoComplete="off"
          aria-describedby={helperId}
          aria-invalid={hasError}
          hasError={hasError}
          disabled={status === 'saving'}
          className="sm:flex-1"
        />
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="md" disabled={!canSave}>
            {status === 'saving' ? t('saving') : t('save')}
          </Button>
          {isDirty ? (
            <Button type="button" variant="ghost" size="md" onClick={handleCancel}>
              {t('cancel')}
            </Button>
          ) : null}
        </div>
      </div>
      <p id={helperId} className={cn('text-xs', helperClass)}>
        {helperMessage}
      </p>
    </form>
  );
}
