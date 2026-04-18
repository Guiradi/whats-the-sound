'use client';

import { MidiCatalogTable } from '@/components/admin/midi-catalog-table';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AdminCatalogPage() {
  const t = useTranslations('adminCatalog');

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
          <Button asChild size="sm">
            <Link href="/admin/catalog/new">
              <Plus className="h-4 w-4" />
              {t('addNew')}
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <MidiCatalogTable />
      </main>
    </div>
  );
}
