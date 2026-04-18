'use client';

import { MidiUploadForm } from '@/components/admin/midi-upload-form';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AdminCatalogNewPage() {
  const t = useTranslations('adminCatalog.form');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-bg-border px-6 py-4">
        <Link
          href="/admin/catalog"
          className="inline-flex items-center gap-2 text-xs text-text-muted transition-colors hover:text-accent-cyan"
        >
          <ArrowLeft className="h-3 w-3" />
          Catalog
        </Link>
        <span className="text-text-muted">/</span>
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">
          {t('createTitle')}
        </h1>
      </header>
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <MidiUploadForm />
      </main>
    </div>
  );
}
