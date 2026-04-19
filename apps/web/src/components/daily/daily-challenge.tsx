'use client';

import { AudioUnlockBanner } from '@/components/audio/audio-unlock-banner';
import { AudioVisualizer } from '@/components/audio/audio-visualizer';
import { DailyResult } from '@/components/daily/daily-result';
import { PhaseAttempts } from '@/components/daily/phase-attempts';
import { PhaseHints } from '@/components/shared/phase-hints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useDaily } from '@/hooks/use-daily';
import { useMidiPlayer } from '@/hooks/use-midi-player';
import { cn } from '@/lib/utils';
import { GuessResult } from '@wts/shared';
import { Loader2, Music, Play, Send, SkipForward } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

export function DailyChallenge() {
  const t = useTranslations('daily');
  const { user, isGuest } = useAuth();
  const userId = user?.id ?? null;
  const { state, isLoading, error, submitGuess, skipPhase, revealedTitle, revealedArtist, streak } =
    useDaily({
      userId,
    });
  const player = useMidiPlayer();
  const [guessInput, setGuessInput] = useState('');
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [midiLoaded, setMidiLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const autoPlayedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load MIDI when state is available and not completed
  useEffect(() => {
    if (!state || state.completed || !state.midiFileUrl || midiLoaded) return;

    player.loadMidi(state.midiFileUrl).then(() => {
      setMidiLoaded(true);
    });
  }, [state, player, midiLoaded]);

  // Auto-play current phase ONCE when player is ready
  useEffect(() => {
    if (!ready || !midiLoaded || !state?.phaseAudioData || state.completed || autoPlayedRef.current)
      return;

    autoPlayedRef.current = true;
    player.play(state.phaseAudioData);
  }, [ready, midiLoaded, state, player]);

  const applyResult = useCallback(
    (result: Awaited<ReturnType<typeof submitGuess>>) => {
      if (!result) return;

      // Set feedback message
      switch (result.result) {
        case GuessResult.CORRECT:
          setLastFeedback(t('feedback.correct'));
          player.playFull().catch(() => {});
          break;
        case GuessResult.HOT:
          setLastFeedback(t('feedback.almost'));
          break;
        case GuessResult.WARM:
          setLastFeedback(t('feedback.warm'));
          break;
        case GuessResult.ARTIST_MATCH:
          setLastFeedback(t('feedback.artistMatch'));
          break;
        case GuessResult.WRONG:
          setLastFeedback(t('feedback.wrong'));
          // Play next phase if available
          if (result.nextPhaseAudioData && !result.completed) {
            player.play(result.nextPhaseAudioData);
          }
          if (result.completed) {
            player.playFull().catch(() => {});
          }
          break;
      }

      setGuessInput('');
      inputRef.current?.focus();
    },
    [player, t],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!guessInput.trim() || isSubmitting) return;
      setIsSubmitting(true);
      setLastFeedback(null);
      const result = await submitGuess(guessInput.trim());
      setIsSubmitting(false);
      applyResult(result);
    },
    [guessInput, isSubmitting, submitGuess, applyResult],
  );

  const handleSkip = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setLastFeedback(null);
    const result = await skipPhase();
    setIsSubmitting(false);
    applyResult(result);
  }, [isSubmitting, skipPhase, applyResult]);

  const handleReplay = useCallback(() => {
    if (state?.phaseAudioData) {
      player.play(state.phaseAudioData);
    }
  }, [state, player]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
        <p className="text-sm text-text-muted">{t('loading')}</p>
      </div>
    );
  }

  // Error state
  if (error || !state) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-accent-red">{error ?? t('error')}</p>
      </div>
    );
  }

  // Completed state — show result
  if (state.completed) {
    return (
      <DailyResult
        dayNumber={state.dayNumber}
        attempts={state.attempts}
        isCorrect={state.isCorrect}
        phaseGuessed={state.phaseGuessed}
        title={revealedTitle}
        artist={revealedArtist}
        currentStreak={streak?.currentStreak ?? null}
        isLoggedIn={!isGuest && !!userId}
      />
    );
  }

  // Ready screen — wait for player to click before starting
  if (!ready) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 p-4 pt-24">
        <div className="text-center">
          <div className="mb-1 flex items-center justify-center gap-2">
            <Music className="h-5 w-5 text-accent-cyan" />
            <h1 className="font-display text-xl font-bold">
              {t('title')} #{state.dayNumber}
            </h1>
          </div>
          <p className="text-sm text-text-muted">{t('readyHint')}</p>
        </div>
        <Button size="lg" onClick={() => setReady(true)} disabled={!midiLoaded}>
          {midiLoaded ? (
            <>
              <Play className="mr-2 h-5 w-5" />
              {t('ready')}
            </>
          ) : (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('loading')}
            </>
          )}
        </Button>
      </div>
    );
  }

  // Playing state
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4">
      <AudioUnlockBanner />

      {/* Header */}
      <div className="text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Music className="h-5 w-5 text-accent-cyan" />
          <h1 className="font-display text-xl font-bold">
            {t('title')} #{state.dayNumber}
          </h1>
        </div>
        <p className="text-sm text-text-muted">
          {t('phase', { current: state.currentPhase, total: 4 })}
        </p>
      </div>

      {/* Phase indicator */}
      <PhaseAttempts attempts={state.attempts} currentPhase={state.currentPhase} totalPhases={4} />

      <PhaseHints hints={state.hints} />

      {/* Audio Visualizer */}
      <AudioVisualizer analyser={player.analyser} isPlaying={player.isPlaying} />

      {/* Replay + skip */}
      <div className="flex justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleReplay} disabled={player.isPlaying}>
          {t('replay')}
        </Button>
        {!isGuest && userId ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="gap-1"
          >
            <SkipForward className="h-4 w-4" />
            {t('skip')}
          </Button>
        ) : null}
      </div>

      {/* Feedback */}
      {lastFeedback && (
        <p
          className={cn(
            'text-center text-sm font-medium',
            lastFeedback === t('feedback.correct') && 'text-accent-green',
            lastFeedback === t('feedback.almost') && 'text-accent-yellow',
            lastFeedback === t('feedback.artistMatch') && 'text-accent-magenta',
            lastFeedback === t('feedback.wrong') && 'text-accent-red',
          )}
        >
          {lastFeedback}
        </p>
      )}

      {/* Guess input */}
      {!isGuest && userId ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            placeholder={t('guessPlaceholder')}
            disabled={isSubmitting}
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" disabled={!guessInput.trim() || isSubmitting} size="icon">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      ) : (
        <div className="rounded-lg border border-bg-border bg-bg-surface p-4 text-center">
          <p className="text-sm text-text-muted">{t('guestCta')}</p>
        </div>
      )}
    </div>
  );
}
