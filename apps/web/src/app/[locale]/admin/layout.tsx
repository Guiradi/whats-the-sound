import { AdminNav } from '@/components/admin/admin-nav';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
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
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-text-muted transition-colors hover:text-accent-cyan"
        >
          <ArrowLeft className="h-3 w-3" />
          WTS
        </Link>
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
