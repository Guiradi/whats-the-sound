'use client';

import { type Locale, localeShortLabels, locales } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

export function LocaleSwitcher() {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common.localeSwitcher');
  const [isPending, startTransition] = useTransition();

  return (
    <nav
      className="inline-flex items-center gap-1 rounded-md border border-bg-border bg-bg-surface p-0.5"
      aria-label={t('label')}
    >
      {locales.map((locale) => {
        const isActive = locale === currentLocale;
        return (
          <button
            key={locale}
            type="button"
            disabled={isActive || isPending}
            onClick={() => {
              document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
              startTransition(() => {
                router.replace(pathname, { locale });
              });
            }}
            className={cn(
              'rounded-sm px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wider transition-colors',
              isActive
                ? 'bg-accent-cyan text-text-on-accent'
                : 'text-text-secondary hover:text-text-primary',
              isPending && !isActive && 'opacity-70',
            )}
            aria-pressed={isActive}
            aria-label={t(locale)}
          >
            {localeShortLabels[locale]}
          </button>
        );
      })}
    </nav>
  );
}
