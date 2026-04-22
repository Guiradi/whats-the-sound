'use client';

import { AudioUnlockBanner } from '@/components/audio/audio-unlock-banner';
import { AudioVisualizer } from '@/components/audio/audio-visualizer';
import { ChatInput } from '@/components/game/chat-input';
import { GameChat } from '@/components/game/game-chat';
import { GameTimer } from '@/components/game/game-timer';
import { MobileDrawer } from '@/components/game/mobile-drawer';
import { PhaseIndicator } from '@/components/game/phase-indicator';
import { PlayerList } from '@/components/game/player-list';
import { RoundReveal } from '@/components/game/round-reveal';
import { RoundTransition } from '@/components/game/round-transition';
import { PhaseHints as PhaseHintsView } from '@/components/shared/phase-hints';
import { Button } from '@/components/ui/button';
import { useGameState } from '@/hooks/use-game-state';
import { useMidiPlayer } from '@/hooks/use-midi-player';
import { useAudioContext } from '@/lib/midi/audio-context';
import { MP_PHASE_INITIAL_COUNTDOWN_MS, MP_PHASE_REPLAY_COUNTDOWN_MS } from '@wts/shared';
import type { ChatMessage, PhaseConfig, PhaseHints, RoomStateSnapshot } from '@wts/shared';
import { MessageCircle, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type CadenceStep =
  | 'idle'
  | 'countdown-initial'
  | 'playing-1'
  | 'countdown-replay'
  | 'playing-2'
  | 'listening';

interface PhaseStartPayload {
  phase: 1 | 2 | 3 | 4;
  endsAt: number;
  audioData: PhaseConfig;
  midiFileUrl: string;
  hints: PhaseHints;
}

interface RoundRevealPayload {
  title: string;
  artist: string;
  correctPlayerIds: string[];
}

interface GameBoardProps {
  snapshot: RoomStateSnapshot;
  chat: ChatMessage[];
  myId: string | null;
  phaseStart: PhaseStartPayload | null;
  roundReveal: RoundRevealPayload | null;
  onSendChat: (text: string) => void;
}

export function GameBoard({
  snapshot,
  chat,
  myId,
  phaseStart,
  roundReveal,
  onSendChat,
}: GameBoardProps) {
  const t = useTranslations('game');
  const gameState = useGameState(snapshot, myId);
  const midiPlayer = useMidiPlayer();
  const { isReady: audioReady } = useAudioContext();
  const currentMidiUrlRef = useRef<string | null>(null);
  const [cadenceStep, setCadenceStep] = useState<CadenceStep>('idle');
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const wasPlayingRef = useRef(false);
  // Keep a stable ref so effects can access the latest midiPlayer without
  // listing the whole object as a dependency (it changes every animation frame
  // because `progress` updates at ~60 fps, which would reset timers each frame).
  const midiPlayerRef = useRef(midiPlayer);
  midiPlayerRef.current = midiPlayer;

  useEffect(() => {
    if (!phaseStart) return;

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    async function runCadence(payload: PhaseStartPayload) {
      try {
        if (payload.midiFileUrl !== currentMidiUrlRef.current) {
          currentMidiUrlRef.current = payload.midiFileUrl;
          await midiPlayerRef.current.loadMidi(payload.midiFileUrl);
        }
      } catch {
        return;
      }
      if (cancelled) return;

      const initialSec = Math.ceil(MP_PHASE_INITIAL_COUNTDOWN_MS / 1000);
      setCadenceStep('countdown-initial');
      setCountdownSeconds(initialSec);

      let remaining = initialSec;
      const initialInterval = setInterval(() => {
        remaining -= 1;
        setCountdownSeconds(Math.max(0, remaining));
        if (remaining <= 0) clearInterval(initialInterval);
      }, 1000);
      intervals.push(initialInterval);

      const playFirst = setTimeout(async () => {
        if (cancelled) return;
        setCadenceStep('playing-1');
        try {
          await midiPlayerRef.current.play(payload.audioData);
        } catch {
          // non-fatal
        }
      }, MP_PHASE_INITIAL_COUNTDOWN_MS);
      timeouts.push(playFirst);

      // Safety: stop MIDI after 30 s regardless of note duration.
      const safetyStop = setTimeout(() => {
        if (cancelled) return;
        midiPlayerRef.current.stop();
      }, 30_000);
      timeouts.push(safetyStop);
    }

    runCadence(phaseStart);

    return () => {
      cancelled = true;
      for (const t of timeouts) clearTimeout(t);
      for (const i of intervals) clearInterval(i);
    };
  }, [phaseStart]);

  useEffect(() => {
    const justEndedFirst =
      wasPlayingRef.current && !midiPlayer.isPlaying && cadenceStep === 'playing-1';
    const justEndedSecond =
      wasPlayingRef.current && !midiPlayer.isPlaying && cadenceStep === 'playing-2';
    wasPlayingRef.current = midiPlayer.isPlaying;

    if (justEndedFirst && phaseStart) {
      const replaySec = Math.ceil(MP_PHASE_REPLAY_COUNTDOWN_MS / 1000);
      setCadenceStep('countdown-replay');
      setCountdownSeconds(replaySec);

      let remaining = replaySec;
      const interval = setInterval(() => {
        remaining -= 1;
        setCountdownSeconds(Math.max(0, remaining));
        if (remaining <= 0) clearInterval(interval);
      }, 1000);

      const timeout = setTimeout(async () => {
        setCadenceStep('playing-2');
        try {
          await midiPlayerRef.current.play(phaseStart.audioData);
        } catch {
          // non-fatal
        }
      }, MP_PHASE_REPLAY_COUNTDOWN_MS);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    if (justEndedSecond) {
      setCadenceStep('listening');
    }
    return undefined;
  }, [midiPlayer.isPlaying, cadenceStep, phaseStart]);

  // Play the full MIDI on round reveal so players hear what the song was.
  // Resetting currentMidiUrlRef ensures the next round reloads the MIDI.
  useEffect(() => {
    if (!roundReveal) return;
    midiPlayerRef.current.playFull().catch(() => {
      // Non-fatal: if audio context is not ready or MIDI missing, skip silently.
    });
    currentMidiUrlRef.current = null;
  }, [roundReveal]);

  // Stop MIDI immediately when the local player guesses correctly.
  useEffect(() => {
    if (!gameState.myCorrect) return;
    if (cadenceStep === 'playing-1' || cadenceStep === 'playing-2') {
      midiPlayerRef.current.stop();
      setCadenceStep('listening');
    }
  }, [gameState.myCorrect, cadenceStep]);

  const playerNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of snapshot.players) {
      map.set(p.id, p.nickname);
    }
    return map;
  }, [snapshot.players]);

  const playerLevels = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const p of snapshot.players) {
      map.set(p.id, p.level);
    }
    return map;
  }, [snapshot.players]);

  const handleSend = useCallback(
    (text: string) => {
      onSendChat(text);
    },
    [onSendChat],
  );

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      {/* Inline fallback if audio wasn't unlocked in the lobby (e.g. reconnection) */}
      {!audioReady && (
        <div className="absolute left-1/2 top-4 z-50 w-full max-w-sm -translate-x-1/2 px-4">
          <AudioUnlockBanner />
        </div>
      )}

      {/* Left sidebar — Players (desktop) */}
      <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-bg-border p-3 lg:block xl:w-72">
        <PlayerList
          players={gameState.sortedPlayers}
          correctPlayerIds={gameState.correctPlayerIds}
          myId={myId}
        />
      </aside>

      {/* Center — Game area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-3 border-b border-bg-border px-4 py-2">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-text-secondary">
                {t('round.label', {
                  current: gameState.roundNumber,
                  total: gameState.totalRounds,
                })}
              </span>
              <PhaseIndicator currentPhase={gameState.phase} />
            </div>
            {gameState.isPlaying && (
              <div className="mt-1.5">
                <GameTimer
                  timeRemaining={gameState.timeRemaining}
                  progress={gameState.timerProgress}
                  color={gameState.timerColor}
                />
              </div>
            )}
          </div>

          {/* Mobile drawer triggers */}
          <div className="flex gap-1 lg:hidden">
            <MobileDrawer
              trigger={
                <Button variant="ghost" size="icon">
                  <Users className="h-5 w-5" />
                </Button>
              }
              title={t('players.title')}
            >
              <PlayerList
                players={gameState.sortedPlayers}
                correctPlayerIds={gameState.correctPlayerIds}
                myId={myId}
              />
            </MobileDrawer>
            <MobileDrawer
              trigger={
                <Button variant="ghost" size="icon">
                  <MessageCircle className="h-5 w-5" />
                </Button>
              }
              title={t('chat.title')}
            >
              <div className="flex h-[50vh] flex-col">
                <GameChat
                  messages={chat}
                  myId={myId}
                  playerNames={playerNames}
                  playerLevels={playerLevels}
                />
                <ChatInput
                  onSend={handleSend}
                  disabled={gameState.myCorrect}
                  isGamePhase={gameState.isPlaying}
                />
              </div>
            </MobileDrawer>
          </div>
        </div>

        {/* Visualizer area */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
          <AudioVisualizer
            analyser={midiPlayer.analyser}
            isPlaying={midiPlayer.isPlaying}
            className="w-full max-w-lg"
          />

          {phaseStart?.hints && <PhaseHintsView hints={phaseStart.hints} />}

          {(cadenceStep === 'countdown-initial' || cadenceStep === 'countdown-replay') &&
            countdownSeconds > 0 && (
              <div
                className="flex flex-col items-center gap-1 text-center"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="text-xs uppercase tracking-wider text-text-muted">
                  {cadenceStep === 'countdown-initial'
                    ? t('cadence.startingIn')
                    : t('cadence.replayIn')}
                </span>
                <span className="font-display text-5xl font-bold text-accent-cyan">
                  {countdownSeconds}
                </span>
              </div>
            )}

          {gameState.myCorrect && (
            <p className="text-sm font-semibold text-accent-green">
              {t('status.youGuessedCorrectly')}
            </p>
          )}
        </div>

        {/* Chat input — mobile bottom fixed */}
        <div className="border-t border-bg-border lg:hidden">
          <ChatInput
            onSend={handleSend}
            disabled={gameState.myCorrect}
            isGamePhase={gameState.isPlaying}
          />
        </div>
      </main>

      {/* Right sidebar — Chat (desktop) */}
      <aside className="hidden w-72 shrink-0 flex-col border-l border-bg-border lg:flex xl:w-80">
        <h3 className="border-b border-bg-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          {t('chat.title')}
        </h3>
        <GameChat
          messages={chat}
          myId={myId}
          playerNames={playerNames}
          playerLevels={playerLevels}
        />
        <ChatInput
          onSend={handleSend}
          disabled={gameState.myCorrect}
          isGamePhase={gameState.isPlaying}
        />
      </aside>

      {/* Overlays */}
      {gameState.isRoundStart && (
        <RoundTransition roundNumber={gameState.roundNumber} totalRounds={gameState.totalRounds} />
      )}

      {roundReveal && (
        <RoundReveal
          title={roundReveal.title}
          artist={roundReveal.artist}
          correctPlayerIds={roundReveal.correctPlayerIds}
          playerNames={playerNames}
        />
      )}
    </div>
  );
}
