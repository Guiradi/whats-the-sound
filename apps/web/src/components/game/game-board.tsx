'use client';

import { AudioVisualizer } from '@/components/audio/audio-visualizer';
import { StartAudioOverlay } from '@/components/audio/start-audio-overlay';
import { ChatInput } from '@/components/game/chat-input';
import { GameChat } from '@/components/game/game-chat';
import { GameTimer } from '@/components/game/game-timer';
import { MobileDrawer } from '@/components/game/mobile-drawer';
import { PhaseIndicator } from '@/components/game/phase-indicator';
import { PlayerList } from '@/components/game/player-list';
import { RoundReveal } from '@/components/game/round-reveal';
import { RoundTransition } from '@/components/game/round-transition';
import { Button } from '@/components/ui/button';
import { useGameState } from '@/hooks/use-game-state';
import { useMidiPlayer } from '@/hooks/use-midi-player';
import type { ChatMessage, PhaseConfig, RoomStateSnapshot } from '@wts/shared';
import { MessageCircle, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef } from 'react';

interface PhaseStartPayload {
  phase: 1 | 2 | 3 | 4;
  endsAt: number;
  audioData: PhaseConfig;
  midiFileUrl: string;
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
  const currentMidiUrlRef = useRef<string | null>(null);

  // Load MIDI and play when phase:start fires
  useEffect(() => {
    if (!phaseStart) return;

    async function handlePhaseStart(payload: PhaseStartPayload) {
      try {
        // Load MIDI file if it's a new URL (new round)
        if (payload.midiFileUrl !== currentMidiUrlRef.current) {
          currentMidiUrlRef.current = payload.midiFileUrl;
          await midiPlayer.loadMidi(payload.midiFileUrl);
        }
        await midiPlayer.play(payload.audioData);
      } catch {
        // Audio errors are non-fatal — game continues without sound
      }
    }

    handlePhaseStart(phaseStart);
  }, [phaseStart, midiPlayer]);

  // Stop audio on round reveal
  useEffect(() => {
    if (roundReveal) {
      midiPlayer.stop();
      currentMidiUrlRef.current = null;
    }
  }, [roundReveal, midiPlayer]);

  const playerNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of snapshot.players) {
      map.set(p.id, p.nickname);
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
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <StartAudioOverlay />

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
                <GameChat messages={chat} myId={myId} />
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
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <AudioVisualizer
            analyser={midiPlayer.analyser}
            isPlaying={midiPlayer.isPlaying}
            className="w-full max-w-lg"
          />

          {gameState.myCorrect && (
            <p className="mt-4 text-sm font-semibold text-accent-green">
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
        <GameChat messages={chat} myId={myId} />
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
