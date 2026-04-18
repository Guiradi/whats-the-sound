'use client';

import { MidiCatalogTable } from '@/components/admin/midi-catalog-table';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AdminCatalogPage() {
  const t = useTranslations('adminCatalog');

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
            {t('heading')}
          </h2>
          <p className="text-sm text-text-secondary">{t('description')}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/catalog/new">
            <Plus className="h-4 w-4" />
            {t('addNew')}
          </Link>
        </Button>
      </div>
      <MidiCatalogTable />
    </main>
  );
}
