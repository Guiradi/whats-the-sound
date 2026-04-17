import { DocsSearch } from '@/components/docs/docs-search';
import { DocsSidebar } from '@/components/docs/docs-sidebar';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { listAllDocs } from '@/lib/docs/fs';
import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function DocsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'docs' });
  const entries = listAllDocs().map((e) => ({
    slug: e.slug,
    slugString: e.slugString,
    title: e.title,
    description: e.description,
  }));

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
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <aside className="flex flex-col gap-4 lg:w-64 lg:flex-shrink-0">
          <DocsSearch entries={entries} />
          <DocsSidebar />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
