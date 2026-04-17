'use client';

import { AudioVisualizer } from '@/components/audio/audio-visualizer';
import { StartAudioOverlay } from '@/components/audio/start-audio-overlay';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMidiPlayer } from '@/hooks/use-midi-player';
import { AudioContextProvider } from '@/lib/midi/audio-context';
import { generateTestMelodyBuffer } from '@/lib/midi/test-melody';
import type { PhaseConfig } from '@wts/shared';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

export default function DevAudioPage() {
  return (
    <AudioContextProvider>
      <StartAudioOverlay />
      <DevAudioTester />
    </AudioContextProvider>
  );
}

function DevAudioTester() {
  const t = useTranslations('dev.audio');
  const player = useMidiPlayer();
  const [url, setUrl] = useState('');

  async function handleLoadUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) return;
    try {
      await player.loadMidi(url.trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Load failed');
    }
  }

  function handleLoadTestMelody() {
    try {
      player.loadMidiFromBuffer(generateTestMelodyBuffer());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Parse failed');
    }
  }

  async function handlePlayPhase(phase: PhaseConfig) {
    try {
      await player.play(phase);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Play failed');
    }
  }

  const demoPhases: PhaseConfig[] = player.midi
    ? [
        {
          tracks: [0],
          startBeat: 0,
          endBeat: 4,
          description: t('phaseDescription.1'),
        },
        {
          tracks: [0],
          startBeat: 0,
          endBeat: 8,
          description: t('phaseDescription.2'),
        },
        {
          tracks: player.midi.tracks.map((tr) => tr.index),
          startBeat: 0,
          endBeat: 8,
          description: t('phaseDescription.3'),
        },
        {
          tracks: player.midi.tracks.map((tr) => tr.index),
          startBeat: 0,
          endBeat: Math.ceil((player.midi.durationSeconds * player.midi.bpm) / 60) + 1,
          description: t('phaseDescription.4'),
        },
      ]
    : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-text-primary">
          {t('title')}
        </h1>
        <p className="text-sm text-text-secondary">{t('description')}</p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-bg-border bg-bg-surface p-4">
        <form className="flex flex-col gap-2" onSubmit={handleLoadUrl}>
          <label htmlFor="midi-url" className="text-sm font-medium text-text-secondary">
            {t('urlLabel')}
          </label>
          <div className="flex gap-2">
            <Input
              id="midi-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('urlPlaceholder')}
              disabled={player.isLoading}
              className="flex-1"
            />
            <Button type="submit" variant="secondary" disabled={!url.trim() || player.isLoading}>
              {player.isLoading ? t('loading') : t('loadUrl')}
            </Button>
          </div>
        </form>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLoadTestMelody}
          disabled={player.isLoading}
        >
          {t('loadTestMelody')}
        </Button>
      </section>

      {player.error ? (
        <div
          role="alert"
          className="rounded-md border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-sm text-accent-red"
        >
          {t('error', { message: player.error.message })}
        </div>
      ) : null}

      {player.midi ? (
        <>
          <section className="flex flex-col gap-3 rounded-lg border border-bg-border bg-bg-surface p-4">
            <p className="text-xs text-text-muted">
              {t('midiInfo', {
                bpm: player.midi.bpm.toFixed(0),
                duration: player.midi.durationSeconds.toFixed(1),
                tracks: player.midi.tracks.length,
              })}
            </p>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
              {t('tracksHeading')}
            </h2>
            <ul className="flex flex-col gap-1">
              {player.midi.tracks.map((track) => (
                <li key={track.index} className="text-sm text-text-secondary">
                  <span className="font-mono text-accent-cyan">#{track.index}</span>{' '}
                  <span className="text-text-primary">{track.name}</span>{' '}
                  <span className="text-text-muted">
                    · {track.instrumentName || track.instrumentFamily} · {track.notes.length} notes
                    {track.isDrum ? ' · drums' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
              {t('phaseHeading')}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {demoPhases.map((phase, index) => (
                <Button
                  key={`phase-${index}-${phase.endBeat}`}
                  variant={player.currentPhase === phase ? 'primary' : 'secondary'}
                  onClick={() => handlePlayPhase(phase)}
                  disabled={player.isLoading}
                >
                  <Play className="h-4 w-4" />
                  {t('phase', { n: index + 1 })}
                </Button>
              ))}
            </div>
            <p className="text-xs text-text-muted">
              {player.currentPhase?.description ?? t('phaseDescription.1')}
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-bg-border bg-bg-surface p-4">
            <ErrorBoundary>
              <AudioVisualizer analyser={player.analyser} isPlaying={player.isPlaying} />
            </ErrorBoundary>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">
                {player.isPlaying ? t('playing') : t('idle')}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={player.stop}
                  disabled={!player.isPlaying}
                >
                  <Pause className="h-4 w-4" />
                  {t('stop')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void player.replay();
                  }}
                  disabled={!player.currentPhase}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('replay')}
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-text-muted">
                {t('progress')}: {(player.progress * 100).toFixed(0)}%
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface-hover">
                <div
                  className="h-full rounded-full bg-accent-cyan transition-[width]"
                  style={{ width: `${player.progress * 100}%` }}
                />
              </div>
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-text-muted">{t('noMidi')}</p>
      )}
    </main>
  );
}
