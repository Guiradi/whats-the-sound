import { mdxComponents } from '@/components/docs/mdx-components';
import type { Locale } from '@/i18n/config';
import { readDoc } from '@/lib/docs/fs';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import remarkGfm from 'remark-gfm';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug?: string[] }>;
}) {
  const { slug } = await params;
  const doc = readDoc(slug ?? []);
  return {
    title: doc ? `${doc.title} — Dev Docs` : 'Dev Docs',
    description: doc?.description,
  };
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug?: string[] }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const doc = readDoc(slug ?? []);
  if (!doc) notFound();
  const t = await getTranslations({ locale, namespace: 'docs' });

  return (
    <article>
      <header className="mb-6 flex flex-col gap-1 border-b border-bg-border pb-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary">
          {doc.title}
        </h1>
        {doc.description ? <p className="text-sm text-text-secondary">{doc.description}</p> : null}
      </header>
      <MDXRemote
        source={doc.source}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        }}
      />
      {doc.lastTask && doc.lastUpdated ? (
        <footer className="mt-12 border-t border-bg-border pt-4 text-xs text-text-muted">
          {t('lastUpdated', { taskId: doc.lastTask, date: doc.lastUpdated })}
        </footer>
      ) : null}
    </article>
  );
}
