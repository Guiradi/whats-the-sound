import type { ChatMessage, MidiEntry, RoomConfig, RoomPlayer } from '@wts/shared';
import type { GameStatus } from '@wts/shared';
import type { PhaseClipPaths } from '../services/phase-clip-manager.js';

/** Server-side player state — extends the wire type with internal fields. */
export interface ServerPlayer extends RoomPlayer {
  socketId: string;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
}

/** Correct answer record for a single round. */
export interface CorrectAnswer {
  playerId: string;
  timestamp: number;
  phase: 1 | 2 | 3 | 4;
  score: number;
}

/** Artist match record — partial score awarded, player keeps guessing title. */
export interface ArtistMatchAnswer {
  playerId: string;
  timestamp: number;
  phase: 1 | 2 | 3 | 4;
  score: number;
}

/** Server-side round state — holds the full MidiEntry (never sent to client). */
export interface ServerRoundState {
  current: number;
  total: number;
  midi: MidiEntry;
  phase: 1 | 2 | 3 | 4 | null;
  phaseStartAt: number;
  phaseEndAt: number;
  correctAnswers: CorrectAnswer[];
  artistMatchAnswers: ArtistMatchAnswer[];
  phaseTimer: ReturnType<typeof setTimeout> | null;
  tickInterval: ReturnType<typeof setInterval> | null;
  /** Storage paths to per-phase clipped MIDI files. Populated async at round start,
   *  used by startPhase to mint short-lived signed URLs. null until prep completes. */
  phaseClipPaths: PhaseClipPaths | null;
}

/** Server-side room state — superset of RoomStateSnapshot. */
export interface ServerRoomState {
  code: string;
  hostId: string;
  config: RoomConfig;
  status: GameStatus;
  createdAt: string;
  players: Map<string, ServerPlayer>;
  round: ServerRoundState | null;
  chat: ChatMessage[];
  version: number;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  playlist: MidiEntry[];
  currentRoundIndex: number;
  /** Unique id per full game session (regenerated on each startGame). Used as source_ref
   *  prefix for XP events to keep them idempotent across repeated plays in the same room. */
  gameSessionId: string | null;
}
