'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from '@/i18n/navigation';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

export function LogoutButton() {
  const t = useTranslations('profile');
  const { signOut } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await signOut();
      toast.success(t('signOutSuccess'));
      router.push('/');
      router.refresh();
    });
  }

  return (
    <Button variant="secondary" size="md" onClick={handleClick} disabled={isPending}>
      <LogOut className="h-4 w-4" />
      {t('signOut')}
    </Button>
  );
}
