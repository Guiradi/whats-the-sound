'use client';

import { LoginForm } from '@/components/auth/login-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  next?: string;
}

export function LoginModal({ open, onOpenChange, next }: LoginModalProps) {
  const t = useTranslations('auth.login');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>
        <LoginForm
          next={next}
          onGuestLogin={() => onOpenChange(false)}
          onOAuthStart={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
