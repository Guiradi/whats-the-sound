'use client';

import { isActivePath } from '@/components/shared/nav-visibility';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { CalendarDays, Home, User, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentType, SVGProps } from 'react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface Tab {
  href: '/' | '/daily' | '/rooms' | '/profile';
  labelKey: 'home' | 'daily' | 'multiplayer' | 'profile';
  icon: IconComponent;
}

const TABS: readonly Tab[] = [
  { href: '/', labelKey: 'home', icon: Home },
  { href: '/daily', labelKey: 'daily', icon: CalendarDays },
  { href: '/rooms', labelKey: 'multiplayer', icon: Users },
  { href: '/profile', labelKey: 'profile', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav
      aria-label={t('primaryLabel')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-bg-border bg-bg-base/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActivePath(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 text-[0.65rem] uppercase tracking-wider transition-colors',
                  active ? 'text-accent-cyan' : 'text-text-muted hover:text-text-primary',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{t(tab.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
