'use client';

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { ReactNode } from 'react';

interface MobileDrawerProps {
  trigger: ReactNode;
  children: ReactNode;
  title: string;
}

export function MobileDrawer({ trigger, children, title }: MobileDrawerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="fixed bottom-0 left-0 right-0 top-auto max-h-[70vh] translate-y-0 overflow-y-auto rounded-b-none rounded-t-xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom">
        <VisuallyHidden>
          <DialogTitle>{title}</DialogTitle>
        </VisuallyHidden>
        {children}
      </DialogContent>
    </Dialog>
  );
}
