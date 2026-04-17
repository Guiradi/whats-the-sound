import { cn } from '@/lib/utils';
import { type InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-bg-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted',
          'transition-colors focus-visible:outline-none focus-visible:border-accent-cyan focus-visible:ring-1 focus-visible:ring-accent-cyan',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError &&
            'border-accent-red focus-visible:border-accent-red focus-visible:ring-accent-red',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
