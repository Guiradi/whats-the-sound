'use client';

import { type GuessAttempt, TestPlayGuessPanel } from '@/components/admin/test-play-guess-panel';
import {
  type ScoreBreakdown,
  TestPlayScorePreview,
  computeScoreBreakdown,
  feedbackToneClass,
} from '@/components/admin/test-play-score-preview';
import { AudioUnlockBanner } from '@/components/audio/audio-unlock-banner';
import { AudioVisualizer } from '@/components/audio/audio-visualizer';
import { GameTimer } from '@/components/game/game-timer';
import { PhaseIndicator } from '@/components/game/phase-indicator';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useMidiPlayer } from '@/hooks/use-midi-player';
import { Link } from '@/i18n/navigation';
import { authFetch } from '@/lib/api-client';
import { AudioContextProvider, useAudioContext } from '@/lib/midi/audio-context';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PHASE_DURATION_SEC,
  GuessResult,
  type MidiPhases,
  type PhaseConfig,
  verifyGuess,
} from '@wts/shared';
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 1 | 2 | 3 | 4;
const ALL_PHASES: Phase[] = [1, 2, 3, 4];
const POSITION_OPTIONS = [1, 2, 3, 4, 5] as const;

interface CatalogEntry {
  id: string;
  title: string;
  artist: string;
  accepted_titles: string[];
  accepted_artists: string[];
  midi_file_url: string;
  phases: MidiPhases;
}

interface TestPlaySandboxProps {
  catalogId: string;
}

export function TestPlaySandbox({ catalogId }: TestPlaySandboxProps) {
  return (
    <AudioContextProvider>
      <TestPlaySandboxInner catalogId={catalogId} />
    </AudioContextProvider>
  );
}

function TestPlaySandboxInner({ catalogId }: TestPlaySandboxProps) {
  const t = useTranslations('adminCatalog.testPlay');
  const { isReady: audioReady } = useAudioContext();
  const midiPlayer = useMidiPlayer();

  const [entry, setEntry] = useState<CatalogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [finished, setFinished] = useState(false);
  const [position, setPosition] = useState<number>(1);
  const [useTimer, setUseTimer] = useState(false);
  const [attempts, setAttempts] = useState<GuessAttempt[]>([]);
  const [firstSolvedPhase, setFirstSolvedPhase] = useState<Phase | null>(null);
  const [artistMatchedBeforeTitle, setArtistMatchedBeforeTitle] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_PHASE_DURATION_SEC);
  const nextAttemptId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`/api/catalog/${catalogId}`);
        if (!res.ok) {
          setLoadError(true);
          return;
        }
        setEntry((await res.json()) as CatalogEntry);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [catalogId]);

  useEffect(() => {
    if (!entry) return;
    midiPlayer.loadMidi(entry.midi_file_url).catch(() => {
      // Errors are non-fatal — UI still usable for verification
    });
    // midiPlayer.loadMidi is a stable useCallback ref — safe to use directly.
    // Using the whole midiPlayer object would cause an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, midiPlayer.loadMidi]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPhase = useCallback(
    async (phase: Phase) => {
      if (!entry) return;
      const config: PhaseConfig = entry.phases[`phase${phase}` as keyof MidiPhases];
      setCurrentPhase(phase);
      setFinished(false);
      setTimeRemaining(DEFAULT_PHASE_DURATION_SEC);
      try {
        await midiPlayer.play(config);
      } catch {
        // Keep guess flow usable even if audio fails
      }

      clearTimer();
      if (useTimer) {
        const startedAt = Date.now();
        timerRef.current = setInterval(() => {
          const elapsed = (Date.now() - startedAt) / 1000;
          const remaining = Math.max(0, DEFAULT_PHASE_DURATION_SEC - elapsed);
          setTimeRemaining(remaining);
          if (remaining === 0) {
            clearTimer();
            midiPlayer.stop();
          }
        }, 200);
      }
    },
    [entry, midiPlayer, useTimer, clearTimer],
  );

  const stopAudio = useCallback(() => {
    midiPlayer.stop();
    clearTimer();
  }, [midiPlayer, clearTimer]);

  const handleReplay = useCallback(async () => {
    if (currentPhase === null) return;
    await startPhase(currentPhase);
  }, [currentPhase, startPhase]);

  const handleNextPhase = useCallback(async () => {
    if (currentPhase === null) {
      await startPhase(1);
      return;
    }
    if (currentPhase < 4) {
      await startPhase((currentPhase + 1) as Phase);
    }
  }, [currentPhase, startPhase]);

  const handleFinish = useCallback(() => {
    stopAudio();
    setFinished(true);
  }, [stopAudio]);

  const handleRestart = useCallback(() => {
    stopAudio();
    setCurrentPhase(null);
    setFinished(false);
    setAttempts([]);
    setFirstSolvedPhase(null);
    setArtistMatchedBeforeTitle(false);
    setTimeRemaining(DEFAULT_PHASE_DURATION_SEC);
    nextAttemptId.current = 0;
  }, [stopAudio]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const handleGuess = useCallback(
    (text: string) => {
      if (!entry || currentPhase === null) return;
      const result = verifyGuess(text, entry.accepted_titles, entry.accepted_artists);
      const id = nextAttemptId.current++;
      setAttempts((prev) => [
        ...prev,
        {
          id,
          phase: currentPhase,
          text,
          result: result.result,
          matchedCandidate: result.matchedCandidate ?? null,
          at: Date.now(),
        },
      ]);

      if (result.result === GuessResult.ARTIST_MATCH && firstSolvedPhase === null) {
        setArtistMatchedBeforeTitle(true);
      }
      if (result.result === GuessResult.CORRECT && firstSolvedPhase === null) {
        setFirstSolvedPhase(currentPhase);
        stopAudio();
      }
    },
    [entry, currentPhase, firstSolvedPhase, stopAudio],
  );

  const breakdown: ScoreBreakdown | null = useMemo(
    () => computeScoreBreakdown(firstSolvedPhase, position, artistMatchedBeforeTitle),
    [firstSolvedPhase, position, artistMatchedBeforeTitle],
  );

  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const feedbackKey = lastAttempt
    ? (
        {
          correct: 'correct',
          hot: 'hot',
          warm: 'warm',
          artist_match: 'artistMatch',
          wrong: 'wrong',
        } as const
      )[lastAttempt.result]
    : null;

  const timerProgress = timeRemaining / DEFAULT_PHASE_DURATION_SEC;
  const timerColor: 'cyan' | 'yellow' | 'red' =
    timeRemaining > DEFAULT_PHASE_DURATION_SEC / 2
      ? 'cyan'
      : timeRemaining > DEFAULT_PHASE_DURATION_SEC / 5
        ? 'yellow'
        : 'red';

  const guessDisabled = currentPhase === null || firstSolvedPhase !== null || finished || !entry;

  const showNextPhaseButton =
    currentPhase !== null && currentPhase < 4 && firstSolvedPhase === null && !finished;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <div className="flex items-start gap-2 rounded-lg border border-accent-yellow/40 bg-accent-yellow/10 px-4 py-3 text-sm text-accent-yellow">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{t('warningBanner')}</p>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href="/admin/catalog"
          className="inline-flex items-center gap-2 text-xs text-text-muted transition-colors hover:text-accent-cyan"
        >
          <ArrowLeft className="h-3 w-3" />
          {t('backToCatalog')}
        </Link>
        <Button variant="ghost" size="sm" onClick={handleRestart} disabled={attempts.length === 0}>
          <RotateCcw className="h-4 w-4" />
          {t('restart')}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
        </div>
      )}

      {!loading && (loadError || !entry) && (
        <p className="py-16 text-center text-sm text-accent-red">{t('loadError')}</p>
      )}

      {!loading && entry && (
        <>
          <header className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-text-muted">{t('title')}</span>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-text-primary">
              {entry.title}
            </h1>
            <p className="text-sm text-text-secondary">{entry.artist}</p>
          </header>

          {!audioReady && (
            <div className="max-w-md">
              <AudioUnlockBanner />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Left column: player + guess */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-bg-border bg-bg-surface p-4">
                <PhaseIndicator currentPhase={currentPhase} />
                <span className="text-xs text-text-muted">
                  {currentPhase === null
                    ? t('phaseIdle')
                    : t('phaseLabel', { phase: currentPhase })}
                </span>

                <label className="ml-auto inline-flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={useTimer}
                    onChange={(e) => setUseTimer(e.target.checked)}
                    className="rounded border-bg-border"
                  />
                  {t('useTimer')}
                </label>
              </div>

              {useTimer && currentPhase !== null && (
                <GameTimer
                  timeRemaining={timeRemaining}
                  progress={timerProgress}
                  color={timerColor}
                />
              )}

              <div className="flex flex-col items-center justify-center rounded-lg border border-bg-border bg-bg-surface p-4">
                <AudioVisualizer
                  analyser={midiPlayer.analyser}
                  isPlaying={midiPlayer.isPlaying}
                  className="w-full"
                />

                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {currentPhase === null ? (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => startPhase(1)}
                      disabled={!audioReady || midiPlayer.isLoading}
                    >
                      {t('startPhase', { phase: 1 })}
                    </Button>
                  ) : (
                    <>
                      <Button variant="secondary" size="md" onClick={handleReplay}>
                        {t('replay')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={stopAudio}
                        disabled={!midiPlayer.isPlaying}
                      >
                        {t('stop')}
                      </Button>
                      {showNextPhaseButton && (
                        <Button
                          variant="primary"
                          size="md"
                          onClick={handleNextPhase}
                          disabled={!audioReady}
                        >
                          {t('nextPhase', { phase: currentPhase + 1 })}
                        </Button>
                      )}
                      <Button variant="secondary" size="md" onClick={handleFinish}>
                        {t('finish')}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {lastAttempt && feedbackKey && (
                <p className={cn('text-sm font-medium', feedbackToneClass(lastAttempt.result))}>
                  {t(`feedback.${feedbackKey}`, { match: lastAttempt.matchedCandidate ?? '' })}
                </p>
              )}

              <TestPlayGuessPanel
                phase={currentPhase ?? 1}
                attempts={attempts}
                onSubmit={handleGuess}
                disabled={guessDisabled}
                autoFocus={currentPhase !== null}
              />

              {finished && (
                <p className="text-sm font-semibold text-accent-green">{t('finishedHeading')}</p>
              )}
            </div>

            {/* Right column: position + score preview */}
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-bg-border bg-bg-surface p-4">
                <label
                  htmlFor="position-select"
                  className="text-xs font-semibold uppercase tracking-wider text-text-muted"
                >
                  {t('position')}
                </label>
                <Select
                  id="position-select"
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value))}
                  className="mt-2 w-full"
                >
                  {POSITION_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {t('positionLabel', { position: p })}
                    </option>
                  ))}
                </Select>
              </div>

              <TestPlayScorePreview breakdown={breakdown} />

              {/* Phase shortcuts */}
              <div className="rounded-lg border border-bg-border bg-bg-surface p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t('phaseLabel', { phase: currentPhase ?? 1 })}
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ALL_PHASES.map((p) => (
                    <Button
                      key={p}
                      variant={currentPhase === p ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => startPhase(p)}
                      disabled={!audioReady || midiPlayer.isLoading}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
