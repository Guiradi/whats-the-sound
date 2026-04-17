import type { GameStatus, GuessResult, MidiCategory, MidiDifficulty } from '../enums/index.js';

export interface PhaseConfig {
  tracks: number[];
  startBeat: number;
  endBeat: number;
  description: string;
}

export interface MidiPhases {
  phase1: PhaseConfig;
  phase2: PhaseConfig;
  phase3: PhaseConfig;
  phase4: PhaseConfig;
}

export interface MidiEntry {
  id: string;
  title: string;
  artist: string;
  category: MidiCategory;
  difficulty: MidiDifficulty;
  year?: number;
  midiFileUrl: string;
  acceptedTitles: string[];
  acceptedArtists: string[];
  phases: MidiPhases;
  isActive: boolean;
  playCount: number;
  correctRate: number;
}

export interface RoomConfig {
  category: MidiCategory | 'random';
  maxRounds: 5 | 10 | 15;
  timePerPhaseSec: 15 | 20 | 30;
  maxPlayers: number;
  isPublic: boolean;
}

export interface RoomPlayer {
  id: string;
  nickname: string;
  avatar: string | null;
  isGuest: boolean;
  totalScore: number;
  correctCount: number;
  connected: boolean;
  joinedAt: string;
}

export interface RoundSnapshot {
  current: number;
  total: number;
  midiId: string | null;
  phase: 1 | 2 | 3 | 4 | null;
  phaseStartAt: number;
  phaseEndAt: number;
  correctPlayerIds: string[];
  phaseAudioData: PhaseConfig | null;
}

export interface ChatMessage {
  id: string;
  authorId: string | 'bot';
  text: string;
  kind: 'player' | 'bot';
  at: number;
}

export interface RoomStateSnapshot {
  room: {
    code: string;
    hostId: string;
    config: RoomConfig;
    status: GameStatus;
    createdAt: string;
  };
  players: RoomPlayer[];
  round: RoundSnapshot | null;
  chat: ChatMessage[];
  version: number;
}

export interface GuessVerificationResult {
  result: GuessResult;
  distance?: number;
  matchedCandidate?: string;
}

export interface ServerToClientEvents {
  'room:state': (snapshot: RoomStateSnapshot) => void;
  'room:host_changed': (payload: { previousHostId: string; newHostId: string }) => void;
  'chat:message': (message: ChatMessage) => void;
  'phase:start': (payload: {
    phase: 1 | 2 | 3 | 4;
    endsAt: number;
    audioData: PhaseConfig;
    midiFileUrl: string;
  }) => void;
  'round:reveal': (payload: { title: string; artist: string; correctPlayerIds: string[] }) => void;
  'error:rate_limited': (payload: { scope: string; retryAfterMs: number }) => void;
  'error:generic': (payload: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'room:create': (config: RoomConfig, ack: (payload: { code: string }) => void) => void;
  'room:join': (payload: { code: string; nickname?: string }) => void;
  'room:leave': () => void;
  'chat:send': (text: string) => void;
  'game:guess': (guess: string) => void;
  'game:start': () => void;
}
