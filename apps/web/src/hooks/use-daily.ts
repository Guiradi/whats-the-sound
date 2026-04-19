'use client';

import { authFetch } from '@/lib/api-client';
import type { DailyAttempt, DailyGuessResponse, DailyState } from '@wts/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDailyOptions {
  userId: string | null;
}

interface DailyStreak {
  currentStreak: number;
  maxStreak: number;
}

interface UseDailyReturn {
  state: DailyState | null;
  isLoading: boolean;
  error: string | null;
  submitGuess: (guess: string) => Promise<DailyGuessResponse | null>;
  skipPhase: () => Promise<DailyGuessResponse | null>;
  revealedTitle: string | null;
  revealedArtist: string | null;
  streak: DailyStreak | null;
}

export function useDaily({ userId }: UseDailyOptions): UseDailyReturn {
  const [state, setState] = useState<DailyState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealedTitle, setRevealedTitle] = useState<string | null>(null);
  const [revealedArtist, setRevealedArtist] = useState<string | null>(null);
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const fetchedRef = useRef(false);

  const fetchResult = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await authFetch('/api/daily/result');
      if (!res.ok) return;
      const data = (await res.json()) as {
        title?: string;
        artist?: string;
        streak?: DailyStreak;
      };
      if (data.title) setRevealedTitle(data.title);
      if (data.artist) setRevealedArtist(data.artist);
      if (data.streak) setStreak(data.streak);
    } catch {
      // Non-fatal — UI shows result without streak
    }
  }, [userId]);

  // Fetch today's daily state
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function load() {
      try {
        setIsLoading(true);

        const res = await authFetch('/api/daily');
        if (!res.ok) {
          throw new Error(`Failed to load daily: ${res.status}`);
        }

        const data = (await res.json()) as DailyState;
        setState(data);

        // If already completed, try to fetch the revealed result
        if (data.completed && userId) {
          await fetchResult();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load daily');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [userId, fetchResult]);

  const postAttempt = useCallback(
    async (body: { guess?: string; skip?: boolean }): Promise<DailyGuessResponse | null> => {
      if (!state || !userId) return null;

      try {
        const res = await authFetch('/api/daily/guess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, phase: state.currentPhase }),
        });

        if (!res.ok) {
          throw new Error(`Guess failed: ${res.status}`);
        }

        const data = (await res.json()) as DailyGuessResponse;

        const newAttempt: DailyAttempt = body.skip
          ? {
              phase: state.currentPhase,
              guess: '',
              result: data.result,
              skipped: true,
            }
          : {
              phase: state.currentPhase,
              guess: body.guess ?? '',
              result: data.result,
            };

        setState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            attempts: [...prev.attempts, newAttempt],
            completed: data.completed,
            isCorrect: data.isCorrect,
            currentPhase: data.nextPhase ?? prev.currentPhase,
            phaseAudioData: data.nextPhaseAudioData ?? prev.phaseAudioData,
            midiFileUrl: data.completed ? null : prev.midiFileUrl,
            hints: data.nextHints ?? prev.hints,
          };
        });

        if (data.completed && data.title) {
          setRevealedTitle(data.title);
          setRevealedArtist(data.artist ?? null);
          fetchResult();
        }

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit guess');
        return null;
      }
    },
    [state, userId, fetchResult],
  );

  const submitGuess = useCallback((guess: string) => postAttempt({ guess }), [postAttempt]);

  const skipPhase = useCallback(() => postAttempt({ skip: true }), [postAttempt]);

  return {
    state,
    isLoading,
    error,
    submitGuess,
    skipPhase,
    revealedTitle,
    revealedArtist,
    streak,
  };
}
