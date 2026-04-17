'use client';

import { useAudioContext } from '@/lib/midi/audio-context';
import { parseMidiFromBuffer, parseMidiFromUrl } from '@/lib/midi/parser';
import { PhasePlayer } from '@/lib/midi/phase-player';
import type { MidiData } from '@/lib/midi/types';
import type { PhaseConfig } from '@wts/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Analyser } from 'tone';

export interface UseMidiPlayer {
  loadMidi: (url: string) => Promise<void>;
  loadMidiFromBuffer: (buffer: ArrayBuffer) => void;
  play: (phase: PhaseConfig) => Promise<void>;
  stop: () => void;
  replay: () => Promise<void>;
  isPlaying: boolean;
  isLoading: boolean;
  currentPhase: PhaseConfig | null;
  progress: number;
  analyser: Analyser | null;
  midi: MidiData | null;
  error: Error | null;
}

export function useMidiPlayer(): UseMidiPlayer {
  const { isReady } = useAudioContext();
  const playerRef = useRef<PhasePlayer | null>(null);
  const rafRef = useRef<number | null>(null);
  const [midi, setMidi] = useState<MidiData | null>(null);
  const [currentPhase, setCurrentPhase] = useState<PhaseConfig | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [analyser, setAnalyser] = useState<Analyser | null>(null);

  // Dispose on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, []);

  const stopProgressLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startProgressLoop = useCallback(() => {
    stopProgressLoop();
    const tick = () => {
      const player = playerRef.current;
      if (!player) return;
      setProgress(player.getProgress());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopProgressLoop]);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    stopProgressLoop();
    setIsPlaying(false);
    setProgress(0);
  }, [stopProgressLoop]);

  const play = useCallback(
    async (phase: PhaseConfig) => {
      if (!isReady) {
        throw new Error('Audio context not ready — call start() from the overlay first.');
      }
      const player = playerRef.current;
      if (!player) {
        throw new Error('Phase player not initialized yet.');
      }
      if (!midi) {
        throw new Error('No MIDI loaded. Call loadMidi(url) first.');
      }
      setError(null);
      setCurrentPhase(phase);
      player.play(midi, phase);
      setIsPlaying(true);
      setProgress(0);
      startProgressLoop();
    },
    [isReady, midi, startProgressLoop],
  );

  const replay = useCallback(async () => {
    if (!currentPhase) return;
    await play(currentPhase);
  }, [currentPhase, play]);

  const resetForLoad = useCallback(() => {
    setError(null);
    playerRef.current?.stop();
    stopProgressLoop();
    setIsPlaying(false);
    setProgress(0);
    setCurrentPhase(null);
  }, [stopProgressLoop]);

  const loadMidi = useCallback(
    async (url: string) => {
      resetForLoad();
      setIsLoading(true);
      try {
        const data = await parseMidiFromUrl(url);
        setMidi(data);
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error('Failed to load MIDI');
        setError(wrapped);
        throw wrapped;
      } finally {
        setIsLoading(false);
      }
    },
    [resetForLoad],
  );

  const loadMidiFromBuffer = useCallback(
    (buffer: ArrayBuffer) => {
      resetForLoad();
      try {
        setMidi(parseMidiFromBuffer(buffer));
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error('Failed to parse MIDI');
        setError(wrapped);
        throw wrapped;
      }
    },
    [resetForLoad],
  );

  // Create the PhasePlayer once the audio context is ready, and wire the
  // onEnded listener in the same effect so the subscription tracks the player's
  // lifecycle (no stale ref problem).
  useEffect(() => {
    if (!isReady) return;
    if (!playerRef.current) {
      playerRef.current = new PhasePlayer();
      setAnalyser(playerRef.current.getAnalyser());
    }
    const unsubscribe = playerRef.current.onEnded(() => {
      setIsPlaying(false);
      setProgress(1);
      stopProgressLoop();
    });
    return unsubscribe;
  }, [isReady, stopProgressLoop]);

  return {
    loadMidi,
    loadMidiFromBuffer,
    play,
    stop,
    replay,
    isPlaying,
    isLoading,
    currentPhase,
    progress,
    analyser,
    midi,
    error,
  };
}
