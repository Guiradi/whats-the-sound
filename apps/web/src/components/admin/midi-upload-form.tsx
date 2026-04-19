'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { authFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { type CategoryInfo, MidiDifficulty, adminCategoriesResponseSchema } from '@wts/shared';
import type { MidiPhases } from '@wts/shared';
import { Check, ChevronLeft, ChevronRight, Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const DIFFICULTIES = Object.values(MidiDifficulty);

const LEADING_ARTICLES = /^(the|o|a|os|as|um|uma)\s+/i;

/**
 * Generate unique accepted-answer variations from an original string.
 * Produces: original, lowercase, no-diacritics, no-apostrophes/hyphens,
 * without leading articles, and combinations thereof.
 */
function generateAcceptedVariations(original: string): string[] {
  if (!original.trim()) return [''];

  const seen = new Set<string>();
  const results: string[] = [];

  function add(s: string) {
    const trimmed = s.replace(/\s+/g, ' ').trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      results.push(trimmed);
    }
  }

  // 1. Original as-is
  add(original);

  // 2. Lowercase
  const lower = original.toLowerCase();
  add(lower);

  // 3. No diacritics (é→e, ã→a, ñ→n, etc.)
  const noDiacritics = lower.normalize('NFD').replace(/\p{Mn}/gu, '');
  add(noDiacritics);

  // 4. No apostrophes (don't → dont, it's → its)
  const noApostrophe = noDiacritics.replace(/[''`]/g, '');
  add(noApostrophe);

  // 5. No hyphens (rock-n-roll → rock n roll)
  const noHyphens = noApostrophe.replace(/-/g, ' ').replace(/\s+/g, ' ');
  add(noHyphens);

  // 6. Strip all non-alphanumeric (keep spaces)
  const alphanumOnly = noHyphens
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  add(alphanumOnly);

  // 7. Without leading articles
  const noArticle = alphanumOnly.replace(LEADING_ARTICLES, '').trim();
  if (noArticle !== alphanumOnly) {
    add(noArticle);
  }

  // 8. If has "&", also add "and" / "e" variants
  if (original.includes('&')) {
    add(alphanumOnly.replace(/&/g, 'and'));
    add(alphanumOnly.replace(/&/g, 'e'));
  }
  if (lower.includes(' and ')) {
    add(alphanumOnly.replace(/\band\b/g, 'e'));
  }
  if (lower.includes(' e ')) {
    add(alphanumOnly.replace(/\be\b/g, 'and'));
  }

  // 9. "feat." / "ft." variations: strip them entirely
  const featPattern = /\s*(feat\.?|ft\.?|featuring)\s+.+$/i;
  if (featPattern.test(original)) {
    add(alphanumOnly.replace(/\s*(feat\.?|ft\.?|featuring)\s+.+$/i, '').trim());
  }

  return results;
}

const STEPS = ['upload', 'metadata', 'answers', 'review'] as const;
type Step = (typeof STEPS)[number];

interface MidiAnalysisResult {
  totalNotes: number;
  bpm: number;
  durationSeconds: number;
  trimmedSeconds: number;
  phases: MidiPhases;
}

interface FormData {
  midiFileUrl: string;
  fileName: string;
  title: string;
  artist: string;
  category: string;
  difficulty: string;
  year: string;
  phases: MidiPhases | null;
  analysis: MidiAnalysisResult | null;
  acceptedTitles: string[];
  acceptedArtists: string[];
}

const defaultFormData: FormData = {
  midiFileUrl: '',
  fileName: '',
  title: '',
  artist: '',
  category: 'rock',
  difficulty: 'medium',
  year: '',
  phases: null,
  analysis: null,
  acceptedTitles: [''],
  acceptedArtists: [''],
};

interface MidiUploadFormProps {
  initialData?: Partial<FormData> & { id?: string };
  mode?: 'create' | 'edit';
}

export function MidiUploadForm({ initialData, mode = 'create' }: MidiUploadFormProps) {
  const t = useTranslations('adminCatalog.form');
  const tCatalog = useTranslations('adminCatalog');
  const router = useRouter();
  const [step, setStep] = useState<Step>(mode === 'edit' ? 'metadata' : 'upload');
  const [form, setForm] = useState<FormData>(() => ({ ...defaultFormData, ...initialData }));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);

  const stepIndex = STEPS.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const updateForm = useCallback((patch: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await authFetch('/api/admin/categories');
        if (res.ok) {
          const parsed = adminCategoriesResponseSchema.safeParse(await res.json());
          if (parsed.success) {
            setCategories(parsed.data.categories);
            if (mode === 'create' && parsed.data.categories.length > 0) {
              const firstEnabled = parsed.data.categories.find((c) => !c.isDisabled);
              if (firstEnabled) {
                updateForm({ category: firstEnabled.name });
              }
            }
          }
        }
      } catch {
        // fallback: categories stay empty
      }
    }
    loadCategories();
  }, [mode, updateForm]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
      );
      const res = await authFetch('/api/catalog/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileBase64: base64 }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        toast.error(err.error?.message ?? t('upload.uploadFailed'));
        return;
      }
      const data = (await res.json()) as {
        url: string;
        analysis: MidiAnalysisResult;
      };
      updateForm({
        midiFileUrl: data.url,
        fileName: file.name,
        phases: data.analysis.phases,
        analysis: data.analysis,
      });
    } catch {
      toast.error(t('upload.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.mid') || file?.name.endsWith('.midi')) {
      handleFileUpload(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        title: form.title,
        artist: form.artist,
        category: form.category,
        difficulty: form.difficulty,
        year: form.year ? Number(form.year) : null,
        midiFileUrl: form.midiFileUrl,
        phases: form.phases,
        acceptedTitles: form.acceptedTitles.filter(Boolean),
        acceptedArtists: form.acceptedArtists.filter(Boolean),
      };

      const url =
        mode === 'edit' && initialData?.id ? `/api/catalog/${initialData.id}` : '/api/catalog';

      const res = await authFetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Save failed');
      toast.success(t('saved'));
      router.push('/admin/catalog');
    } catch {
      toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 'upload':
        return !!form.midiFileUrl && !!form.phases;
      case 'metadata':
        return !!form.title && !!form.artist && !!form.category && !!form.difficulty;
      case 'answers':
        return form.acceptedTitles.some(Boolean) && form.acceptedArtists.some(Boolean);
      case 'review':
        return true;
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i <= stepIndex && setStep(s)}
              className={cn(
                'flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors',
                step === s
                  ? 'bg-accent-cyan text-text-on-accent'
                  : i < stepIndex
                    ? 'bg-bg-surface text-accent-cyan'
                    : 'bg-bg-surface text-text-muted',
              )}
            >
              {i < stepIndex ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{t(`steps.${s}`)}</span>
            </button>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-bg-border" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-6">
          {/* Upload step */}
          {step === 'upload' && (
            <div className="flex flex-col gap-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={cn(
                  'flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-bg-border p-12 transition-colors',
                  'hover:border-accent-cyan',
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
                    <p className="text-sm text-text-muted">{t('upload.analyzing')}</p>
                  </>
                ) : form.midiFileUrl ? (
                  <>
                    <Check className="h-8 w-8 text-accent-green" />
                    <p className="text-sm text-text-primary">{t('upload.uploaded')}</p>
                    <p className="text-xs text-text-muted">{form.fileName}</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-text-muted" />
                    <p className="text-sm text-text-muted">{t('upload.hint')}</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mid,.midi"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {t('upload.label')}
                </Button>
              </div>

              {/* Analysis results */}
              {form.analysis && (
                <div className="rounded-lg bg-bg-surface p-4">
                  <h4 className="mb-3 text-sm font-semibold text-text-primary">
                    {t('upload.analysisTitle')}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-text-muted">{t('upload.bpm')}</span>
                    <span className="text-text-primary">{form.analysis.bpm}</span>
                    <span className="text-text-muted">{t('upload.noteEvents')}</span>
                    <span className="text-text-primary">{form.analysis.totalNotes}</span>
                    <span className="text-text-muted">{t('upload.duration')}</span>
                    <span className="text-text-primary">
                      {Math.floor(form.analysis.durationSeconds / 60)}:
                      {String(Math.floor(form.analysis.durationSeconds % 60)).padStart(2, '0')}
                    </span>
                    {form.analysis.trimmedSeconds > 0 && (
                      <>
                        <span className="text-text-muted">{t('upload.trimmed')}</span>
                        <span className="text-accent-cyan">
                          {form.analysis.trimmedSeconds.toFixed(1)}s
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {[4, 8, 16, 32].map((n, i) => (
                      <Badge key={n} variant={i === 3 ? 'cyan' : 'default'}>
                        {t('upload.phase')} {i + 1}: {n} {t('upload.notesUnit')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadata step */}
          {step === 'metadata' && (
            <div className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="midi-title"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  {t('metadata.title')}
                </label>
                <Input
                  id="midi-title"
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                />
              </div>
              <div>
                <label
                  htmlFor="midi-artist"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  {t('metadata.artist')}
                </label>
                <Input
                  id="midi-artist"
                  value={form.artist}
                  onChange={(e) => updateForm({ artist: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="midi-category"
                    className="mb-1.5 block text-sm font-medium text-text-secondary"
                  >
                    {t('metadata.category')}
                  </label>
                  <select
                    id="midi-category"
                    value={form.category}
                    onChange={(e) => updateForm({ category: e.target.value })}
                    className="h-10 w-full rounded-md border border-bg-border bg-bg-surface px-3 text-sm text-text-primary"
                  >
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>
                        {tCatalog(`categories.${c.name}`)}
                        {c.isDisabled ? ` (${tCatalog('categoryDisabled')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="midi-difficulty"
                    className="mb-1.5 block text-sm font-medium text-text-secondary"
                  >
                    {t('metadata.difficulty')}
                  </label>
                  <select
                    id="midi-difficulty"
                    value={form.difficulty}
                    onChange={(e) => updateForm({ difficulty: e.target.value })}
                    className="h-10 w-full rounded-md border border-bg-border bg-bg-surface px-3 text-sm text-text-primary"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {tCatalog(`difficulties.${d}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="midi-year"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  {t('metadata.year')}
                </label>
                <Input
                  id="midi-year"
                  type="number"
                  min={1900}
                  max={2030}
                  value={form.year}
                  onChange={(e) => updateForm({ year: e.target.value })}
                  placeholder={t('metadata.yearPlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Answers step */}
          {step === 'answers' && (
            <div className="flex flex-col gap-6">
              <h3 className="text-base font-semibold text-text-primary">{t('answers.heading')}</h3>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t('answers.titlesLabel')}
                </span>
                <p className="mb-2 text-xs text-text-muted">{t('answers.titlesHint')}</p>
                {form.acceptedTitles.map((title, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: dynamic list with add/remove by index
                  <div key={i} className="mb-2 flex gap-2">
                    <Input
                      value={title}
                      onChange={(e) => {
                        const next = [...form.acceptedTitles];
                        next[i] = e.target.value;
                        updateForm({ acceptedTitles: next });
                      }}
                    />
                    {form.acceptedTitles.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateForm({
                            acceptedTitles: form.acceptedTitles.filter((_, idx) => idx !== i),
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateForm({ acceptedTitles: [...form.acceptedTitles, ''] })}
                >
                  {t('answers.addAnswer')}
                </Button>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t('answers.artistsLabel')}
                </span>
                <p className="mb-2 text-xs text-text-muted">{t('answers.artistsHint')}</p>
                {form.acceptedArtists.map((artist, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: dynamic list with add/remove by index
                  <div key={i} className="mb-2 flex gap-2">
                    <Input
                      value={artist}
                      onChange={(e) => {
                        const next = [...form.acceptedArtists];
                        next[i] = e.target.value;
                        updateForm({ acceptedArtists: next });
                      }}
                    />
                    {form.acceptedArtists.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateForm({
                            acceptedArtists: form.acceptedArtists.filter((_, idx) => idx !== i),
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateForm({ acceptedArtists: [...form.acceptedArtists, ''] })}
                >
                  {t('answers.addAnswer')}
                </Button>
              </div>
            </div>
          )}

          {/* Review step */}
          {step === 'review' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-semibold text-text-primary">{t('review.heading')}</h3>
              <p className="text-sm text-text-muted">{t('review.confirm')}</p>

              <div className="grid gap-3 rounded-lg bg-bg-surface p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('metadata.title')}</span>
                  <span className="font-medium text-text-primary">{form.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('metadata.artist')}</span>
                  <span className="font-medium text-text-primary">{form.artist}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('metadata.category')}</span>
                  <Badge variant="cyan">{tCatalog(`categories.${form.category}`)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('metadata.difficulty')}</span>
                  <Badge
                    variant={
                      form.difficulty === 'easy'
                        ? 'green'
                        : form.difficulty === 'hard'
                          ? 'red'
                          : 'yellow'
                    }
                  >
                    {tCatalog(`difficulties.${form.difficulty}`)}
                  </Badge>
                </div>
                {form.year && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t('metadata.year')}</span>
                    <span className="text-text-primary">{form.year}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('answers.titlesLabel')}</span>
                  <span className="text-text-primary">
                    {form.acceptedTitles.filter(Boolean).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('answers.artistsLabel')}</span>
                  <span className="text-text-primary">
                    {form.acceptedArtists.filter(Boolean).length}
                  </span>
                </div>
                {form.analysis && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{t('upload.noteEvents')}</span>
                      <span className="text-text-primary">{form.analysis.totalNotes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{t('upload.bpm')}</span>
                      <span className="text-text-primary">{form.analysis.bpm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{t('review.phases')}</span>
                      <span className="text-text-primary">
                        4, 8, 16, 32 {t('upload.notesUnit')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          {!isFirst && (
            <Button variant="ghost" onClick={() => setStep(STEPS[stepIndex - 1] as Step)}>
              <ChevronLeft className="h-4 w-4" />
              {t('previous')}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push('/admin/catalog')}>
            {t('cancel')}
          </Button>
          {isLast ? (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('save')
              )}
            </Button>
          ) : (
            <Button
              onClick={() => {
                const nextStep = STEPS[stepIndex + 1] as Step;
                // Auto-generate accepted variations when entering answers step
                if (
                  nextStep === 'answers' &&
                  form.acceptedTitles.length <= 1 &&
                  !form.acceptedTitles[0]
                ) {
                  updateForm({
                    acceptedTitles: generateAcceptedVariations(form.title),
                    acceptedArtists: generateAcceptedVariations(form.artist),
                  });
                }
                setStep(nextStep);
              }}
              disabled={!canProceed()}
            >
              {t('next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
