'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'group toast border border-bg-border bg-bg-surface text-text-primary shadow-lg',
          description: 'text-text-secondary',
          actionButton: 'bg-accent-cyan text-text-on-accent',
          cancelButton: 'bg-bg-surface-hover text-text-secondary',
          success: 'border-l-4 border-l-accent-green',
          error: 'border-l-4 border-l-accent-red',
          warning: 'border-l-4 border-l-accent-yellow',
          info: 'border-l-4 border-l-accent-cyan',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
