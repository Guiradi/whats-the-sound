import type { GameStatus, GuessResult, MidiCategory, MidiDifficulty } from '../enums/index.js';

export interface PhaseConfig {
  startBeat: number;
  endBeat: number;
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
  level: number | null;
  isReady: boolean;
}

export interface RoundSnapshot {
  current: number;
  total: number;
  midiId: string | null;
  phase: 1 | 2 | 3 | 4 | null;
  phaseStartAt: number;
  phaseEndAt: number;
  correctPlayerIds: string[];
  artistMatchPlayerIds: string[];
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

// --- Daily Sound Types ---

export interface DailyAttempt {
  phase: 1 | 2 | 3 | 4;
  guess: string;
  result: GuessResult;
  skipped?: boolean;
}

export interface DailyState {
  midiId: string;
  date: string;
  dayNumber: number;
  category: MidiCategory;
  currentPhase: 1 | 2 | 3 | 4;
  attempts: DailyAttempt[];
  completed: boolean;
  isCorrect: boolean;
  phaseAudioData: PhaseConfig | null;
  midiFileUrl: string | null;
}

export interface DailyGuessResponse {
  result: GuessResult;
  completed: boolean;
  isCorrect: boolean;
  nextPhase: 1 | 2 | 3 | 4 | null;
  nextPhaseAudioData: PhaseConfig | null;
  /** Revealed only on completion */
  title?: string;
  artist?: string;
}

export interface DailyHistoryEntry {
  date: string;
  dayNumber: number;
  midiId: string;
  title: string;
  artist: string;
  category: MidiCategory;
  phaseGuessed: number | null;
  completed: boolean;
  isCorrect: boolean;
}

// --- XP Types ---

export type XpSource =
  | 'multiplayer_correct'
  | 'multiplayer_finish'
  | 'multiplayer_round_played'
  | 'daily_correct'
  | 'daily_participation'
  | 'daily_streak_bonus'
  | 'daily_login'
  | 'login_streak_bonus'
  | 'first_match_of_day'
  | 'referral_bonus'
  | 'achievement_unlocked';

export interface XpEvent {
  id: string;
  userId: string;
  source: XpSource;
  sourceRef: string;
  amount: number;
  capped: boolean;
  context: Record<string, unknown>;
  createdAt: string;
}

export interface XpAwardResult {
  previousLevel: number;
  newLevel: number;
  xpGained: number;
  capped: boolean;
}

export interface XpProfileData {
  xp: number;
  level: number;
  nextLevelXp: number;
  todayEarned: number;
  todayCap: number;
  recentEvents: XpEvent[];
}

export interface XpLevelUpPayload {
  previousLevel: number;
  newLevel: number;
  xpGained: number;
}

export interface XpAwardedPayload {
  amount: number;
  source: XpSource;
  newTotal: number;
  newLevel: number;
}

export interface AchievementUnlockedPayload {
  achievementId: string;
  tier: 'bronze' | 'silver' | 'gold';
  xpReward: number;
  unlockedAt: string;
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
  'xp:level_up': (payload: XpLevelUpPayload) => void;
  'xp:awarded': (payload: XpAwardedPayload) => void;
  'achievement:unlocked': (payload: AchievementUnlockedPayload) => void;
  'error:rate_limited': (payload: { scope: string; retryAfterMs: number }) => void;
  'error:generic': (payload: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'room:create': (config: RoomConfig, ack: (payload: { code: string }) => void) => void;
  'room:join': (payload: { code: string; nickname?: string }) => void;
  'room:leave': () => void;
  'player:ready': (ready: boolean) => void;
  'chat:send': (text: string) => void;
  'game:guess': (guess: string) => void;
  'game:start': () => void;
}
