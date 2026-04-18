'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { BarChart3, BookOpen, Music } from 'lucide-react';
import { useTranslations } from 'next-intl';

const NAV_ITEMS = [
  { key: 'dashboard' as const, href: '/admin', icon: BarChart3 },
  { key: 'catalog' as const, href: '/admin/catalog', icon: Music },
  { key: 'docs' as const, href: '/admin/docs', icon: BookOpen },
];

export function AdminNav() {
  const t = useTranslations('admin.nav');
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === '/admin') {
      return pathname === '/admin' || pathname.endsWith('/admin');
    }
    return pathname.startsWith(href) || pathname.includes(href);
  }

  return (
    <nav className="flex gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-accent-cyan/10 text-accent-cyan'
                : 'text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary',
            )}
          >
            <Icon className="h-4 w-4" />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
