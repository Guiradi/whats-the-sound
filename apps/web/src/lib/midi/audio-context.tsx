'use client';

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Tone from 'tone';

interface AudioContextValue {
  isReady: boolean;
  isStarting: boolean;
  error: Error | null;
  start: () => Promise<void>;
}

const AudioReadyContext = createContext<AudioContextValue | null>(null);

export function AudioContextProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (Tone.getContext().state === 'running') {
      setIsReady(true);
    }
  }, []);

  const start = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (Tone.getContext().state === 'running') {
      setIsReady(true);
      return;
    }
    setIsStarting(true);
    try {
      await Tone.start();
      setIsReady(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to start audio'));
    } finally {
      setIsStarting(false);
    }
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({ isReady, isStarting, error, start }),
    [isReady, isStarting, error, start],
  );

  return <AudioReadyContext.Provider value={value}>{children}</AudioReadyContext.Provider>;
}

export function useAudioContext(): AudioContextValue {
  const ctx = useContext(AudioReadyContext);
  if (!ctx) {
    throw new Error('useAudioContext must be used within AudioContextProvider');
  }
  return ctx;
}
