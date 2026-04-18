'use client';

import { AuthMenu } from '@/components/auth/auth-menu';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface NavLink {
  href: '/daily' | '/rooms' | '/profile';
  labelKey: 'daily' | 'multiplayer' | 'profile';
}

const LINKS: readonly NavLink[] = [
  { href: '/daily', labelKey: 'daily' },
  { href: '/rooms', labelKey: 'multiplayer' },
  { href: '/profile', labelKey: 'profile' },
] as const;

const HIDDEN_PATH_PREFIXES = ['/login', '/admin', '/auth/callback'];

function shouldHide(pathname: string | null): boolean {
  if (!pathname) return false;
  // pathname from next-intl is locale-relative (e.g. "/rooms")
  if (
    HIDDEN_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return true;
  }
  // Hide on active game room
  if (/^\/room\/[^/]+/.test(pathname)) return true;
  return false;
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopHeader() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  if (shouldHide(pathname)) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-bg-border/60 bg-bg-base/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-wide text-text-primary transition-colors hover:text-accent-cyan"
          aria-label={t('homeLabel')}
        >
          WTS
        </Link>

        <nav aria-label={t('primaryLabel')} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active ? 'text-accent-cyan' : 'text-text-secondary hover:text-text-primary',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <AuthMenu />
      </div>
    </header>
  );
}
