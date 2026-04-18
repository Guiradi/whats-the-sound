import { AdminBackLink } from '@/components/admin/admin-back-link';
import { AdminNav } from '@/components/admin/admin-nav';
import type { Locale } from '@/i18n/config';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-bg-border px-6 py-4">
        <AdminBackLink />
        <span className="text-text-muted">/</span>
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">
          {t('heading')}
        </h1>
        <div className="ml-auto">
          <AdminNav />
        </div>
      </header>
      {children}
    </div>
  );
}
