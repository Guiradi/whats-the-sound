import { DocsSearch } from '@/components/docs/docs-search';
import { DocsSidebar } from '@/components/docs/docs-sidebar';
import type { Locale } from '@/i18n/config';
import { listAllDocs } from '@/lib/docs/fs';
import { setRequestLocale } from 'next-intl/server';
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
  const entries = listAllDocs().map((e) => ({
    slug: e.slug,
    slugString: e.slugString,
    title: e.title,
    description: e.description,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 lg:flex-row">
      <aside className="flex flex-col gap-4 lg:w-64 lg:flex-shrink-0">
        <DocsSearch entries={entries} />
        <DocsSidebar />
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
