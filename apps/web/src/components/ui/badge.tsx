import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border border-bg-border bg-bg-surface text-text-secondary',
        cyan: 'bg-accent-cyan text-text-on-accent shadow-[var(--shadow-glow-cyan)]',
        magenta: 'bg-accent-magenta text-text-primary shadow-[var(--shadow-glow-magenta)]',
        yellow: 'bg-accent-yellow text-text-on-accent shadow-[var(--shadow-glow-yellow)]',
        green: 'bg-accent-green text-text-on-accent',
        red: 'bg-accent-red text-text-primary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
