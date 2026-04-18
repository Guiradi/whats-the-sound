'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { env } from '@/env';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { MidiCategory, MidiDifficulty } from '@wts/shared';
import type { MidiPhases, PhaseConfig } from '@wts/shared';
import { Check, ChevronLeft, ChevronRight, Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

const CATEGORIES = Object.values(MidiCategory);
const DIFFICULTIES = Object.values(MidiDifficulty);

const STEPS = ['upload', 'metadata', 'phases', 'answers', 'review'] as const;
type Step = (typeof STEPS)[number];

interface FormData {
  midiFileUrl: string;
  fileName: string;
  title: string;
  artist: string;
  category: string;
  difficulty: string;
  year: string;
  phases: MidiPhases;
  acceptedTitles: string[];
  acceptedArtists: string[];
}

const defaultPhase = (tracks: number[], startBeat: number, endBeat: number): PhaseConfig => ({
  tracks,
  startBeat,
  endBeat,
  description: '',
});

const defaultFormData: FormData = {
  midiFileUrl: '',
  fileName: '',
  title: '',
  artist: '',
  category: 'rock',
  difficulty: 'medium',
  year: '',
  phases: {
    phase1: defaultPhase([0], 0, 4),
    phase2: defaultPhase([0], 0, 8),
    phase3: defaultPhase([0, 1], 0, 8),
    phase4: defaultPhase([0, 1, 2], 0, 16),
  },
  acceptedTitles: [''],
  acceptedArtists: [''],
};

interface MidiUploadFormProps {
  initialData?: Partial<FormData> & { id?: string };
  mode?: 'create' | 'edit';
}

export function MidiUploadForm({ initialData, mode = 'create' }: MidiUploadFormProps) {
  const t = useTranslations('adminCatalog.form');
  const router = useRouter();
  const [step, setStep] = useState<Step>(mode === 'edit' ? 'metadata' : 'upload');
  const [form, setForm] = useState<FormData>(() => ({ ...defaultFormData, ...initialData }));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEPS.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const updateForm = useCallback((patch: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const updatePhase = useCallback((phaseKey: keyof MidiPhases, patch: Partial<PhaseConfig>) => {
    setForm((prev) => ({
      ...prev,
      phases: {
        ...prev.phases,
        [phaseKey]: { ...prev.phases[phaseKey], ...patch },
      },
    }));
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
      );
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/catalog/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'admin' },
        credentials: 'include',
        body: JSON.stringify({ fileName: file.name, fileBase64: base64 }),
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = (await res.json()) as { url: string };
      updateForm({ midiFileUrl: data.url, fileName: file.name });
    } catch {
      toast.error('Upload failed');
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
        mode === 'edit' && initialData?.id
          ? `${env.NEXT_PUBLIC_SERVER_URL}/api/catalog/${initialData.id}`
          : `${env.NEXT_PUBLIC_SERVER_URL}/api/catalog`;

      const res = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'admin' },
        credentials: 'include',
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
        return !!form.midiFileUrl;
      case 'metadata':
        return !!form.title && !!form.artist && !!form.category && !!form.difficulty;
      case 'phases':
        return true;
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
                  <p className="text-sm text-text-muted">{t('upload.uploading')}</p>
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
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
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
                        {d}
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

          {/* Phases step */}
          {step === 'phases' && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-base font-semibold text-text-primary">{t('phases.heading')}</h3>
                <p className="text-sm text-text-muted">{t('phases.description')}</p>
              </div>
              {(['phase1', 'phase2', 'phase3', 'phase4'] as const).map((phaseKey, i) => (
                <Card key={phaseKey}>
                  <CardHeader>
                    <CardTitle className="text-sm">Phase {i + 1}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <label
                          htmlFor={`${phaseKey}-tracks`}
                          className="mb-1 block text-xs text-text-muted"
                        >
                          {t('phases.tracks')}
                        </label>
                        <Input
                          id={`${phaseKey}-tracks`}
                          value={form.phases[phaseKey].tracks.join(', ')}
                          onChange={(e) =>
                            updatePhase(phaseKey, {
                              tracks: e.target.value
                                .split(',')
                                .map((s) => Number(s.trim()))
                                .filter((n) => !Number.isNaN(n)),
                            })
                          }
                          placeholder="0, 1"
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`${phaseKey}-start`}
                          className="mb-1 block text-xs text-text-muted"
                        >
                          {t('phases.startBeat')}
                        </label>
                        <Input
                          id={`${phaseKey}-start`}
                          type="number"
                          min={0}
                          value={form.phases[phaseKey].startBeat}
                          onChange={(e) =>
                            updatePhase(phaseKey, { startBeat: Number(e.target.value) })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`${phaseKey}-end`}
                          className="mb-1 block text-xs text-text-muted"
                        >
                          {t('phases.endBeat')}
                        </label>
                        <Input
                          id={`${phaseKey}-end`}
                          type="number"
                          min={0}
                          value={form.phases[phaseKey].endBeat}
                          onChange={(e) =>
                            updatePhase(phaseKey, { endBeat: Number(e.target.value) })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`${phaseKey}-desc`}
                          className="mb-1 block text-xs text-text-muted"
                        >
                          {t('phases.phaseDescription')}
                        </label>
                        <Input
                          id={`${phaseKey}-desc`}
                          value={form.phases[phaseKey].description}
                          onChange={(e) => updatePhase(phaseKey, { description: e.target.value })}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  <span className="text-text-muted">Title</span>
                  <span className="font-medium text-text-primary">{form.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Artist</span>
                  <span className="font-medium text-text-primary">{form.artist}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Category</span>
                  <Badge variant="cyan">{form.category}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Difficulty</span>
                  <Badge
                    variant={
                      form.difficulty === 'easy'
                        ? 'green'
                        : form.difficulty === 'hard'
                          ? 'red'
                          : 'yellow'
                    }
                  >
                    {form.difficulty}
                  </Badge>
                </div>
                {form.year && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Year</span>
                    <span className="text-text-primary">{form.year}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-muted">Accepted titles</span>
                  <span className="text-text-primary">
                    {form.acceptedTitles.filter(Boolean).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Accepted artists</span>
                  <span className="text-text-primary">
                    {form.acceptedArtists.filter(Boolean).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Phases configured</span>
                  <span className="text-text-primary">4</span>
                </div>
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
            <Button onClick={() => setStep(STEPS[stepIndex + 1] as Step)} disabled={!canProceed()}>
              {t('next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
