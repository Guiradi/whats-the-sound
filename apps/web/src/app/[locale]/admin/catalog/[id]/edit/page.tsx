'use client';

import { MidiUploadForm } from '@/components/admin/midi-upload-form';
import { Link } from '@/i18n/navigation';
import { authFetch } from '@/lib/api-client';
import type { MidiPhases } from '@wts/shared';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CatalogEntry {
  id: string;
  title: string;
  artist: string;
  category: string;
  difficulty: string;
  year: number | null;
  midi_file_url: string;
  accepted_titles: string[];
  accepted_artists: string[];
  phases: MidiPhases;
}

export default function AdminCatalogEditPage() {
  const t = useTranslations('adminCatalog');
  const params = useParams<{ id: string }>();
  const [entry, setEntry] = useState<CatalogEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`/api/catalog/${params.id}`);
        if (res.ok) {
          setEntry((await res.json()) as CatalogEntry);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">Not found</div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-bg-border px-6 py-4">
        <Link
          href="/admin/catalog"
          className="inline-flex items-center gap-2 text-xs text-text-muted transition-colors hover:text-accent-cyan"
        >
          <ArrowLeft className="h-3 w-3" />
          {t('breadcrumbCatalog')}
        </Link>
        <span className="text-text-muted">/</span>
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">
          {t('form.editTitle')}
        </h1>
      </header>
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <MidiUploadForm
          mode="edit"
          initialData={{
            id: entry.id,
            title: entry.title,
            artist: entry.artist,
            category: entry.category,
            difficulty: entry.difficulty,
            year: entry.year?.toString() ?? '',
            midiFileUrl: entry.midi_file_url,
            fileName: entry.midi_file_url.split('/').pop() ?? '',
            acceptedTitles: entry.accepted_titles.length > 0 ? entry.accepted_titles : [''],
            acceptedArtists: entry.accepted_artists.length > 0 ? entry.accepted_artists : [''],
            phases: entry.phases,
          }}
        />
      </main>
    </div>
  );
}
