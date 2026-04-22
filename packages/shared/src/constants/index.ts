import type { MidiCategory } from '../enums/index.js';

export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const MAX_PLAYERS_PER_ROOM = 20;
export const MIN_PLAYERS_PER_ROOM = 1;
export const DEFAULT_MAX_PLAYERS = 12;

export const ALLOWED_ROUND_COUNTS = [5, 10, 15] as const;
export const DEFAULT_ROUND_COUNT = 10;

export const ALLOWED_PHASE_DURATIONS_SEC = [25, 35, 45] as const;
export const DEFAULT_PHASE_DURATION_SEC = 35;

export const MP_PHASE_INITIAL_COUNTDOWN_MS = 3000;
export const MP_PHASE_REPLAY_COUNTDOWN_MS = 2000;

export const TOTAL_PHASES = 4;

export const PHASE_SCORES = {
  1: { max: 1000, decay: 100, floor: 300 },
  2: { max: 750, decay: 75, floor: 225 },
  3: { max: 500, decay: 50, floor: 150 },
  4: { max: 250, decay: 25, floor: 100 },
} as const;

export const SIMULTANEOUS_ANSWER_WINDOW_MS = 50;

/** Ratio of phase score awarded for guessing the artist (remaining goes to title). */
export const ARTIST_MATCH_SCORE_RATIO = 0.5;

/** Levenshtein edit distance thresholds (number of character edits). */
export const LEVENSHTEIN_THRESHOLDS = {
  multiplayer: {
    correct: 1,
    hot: 3,
    warm: 5,
  },
  daily: {
    correct: 2,
    almost: 3,
  },
} as const;

export const ROOM_CLEANUP_EMPTY_MS = 5 * 60 * 1000;
export const PLAYER_DISCONNECT_GRACE_MS = 30 * 1000;

export const CHAT_RATE_LIMIT = {
  messagesPer10s: 5,
  guessesPerSec: 1,
  roomsPer10min: 3,
};

export const DAILY_RESET_CRON_UTC = '0 3 * * *';
export const DAILY_TIMEZONE = 'America/Sao_Paulo';
export const DAILY_BUFFER_DAYS = 100;

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;
export const NICKNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

// --- Daily Sound ---

/** Day-of-week → category mapping (BRT weekday, 0=Sunday) */
export const WEEKDAY_CATEGORY: Record<number, MidiCategory | 'random'> = {
  0: 'classical', // Sunday
  1: 'pop', // Monday
  2: 'rock', // Tuesday
  3: 'games', // Wednesday
  4: 'mpb', // Thursday
  5: 'random', // Friday
  6: 'anime', // Saturday
};

export const DAILY_PHASES_TOTAL = 4;
export const DAILY_MAX_ATTEMPTS_PER_PHASE = 1;

// --- XP System ---

/**
 * Anti-abuse safety cap. Real players never approach this — the level curve is quadratic,
 * so the game naturally paces progression. This only exists to stop scripted bots from
 * inflating XP beyond any plausible human session.
 */
export const XP_DAILY_SAFETY_CAP = 50_000;

export const XP_DAILY_CORRECT: Record<number, number> = {
  1: 150,
  2: 100,
  3: 75,
  4: 50,
};

export const XP_DAILY_PARTICIPATION = 15;

export const XP_MULTIPLAYER_CORRECT_DIVISOR = 10;
export const XP_MULTIPLAYER_FINISH_BASE = 50;
export const XP_MULTIPLAYER_ROUND_PLAYED = 5;

export const XP_MULTIPLAYER_PODIUM: Record<number, number> = {
  1: 100,
  2: 50,
  3: 25,
};

export const XP_STREAK_MULTIPLIER = 10;
export const XP_STREAK_CAP = 30;

export const XP_DAILY_LOGIN = 25;
export const XP_LOGIN_STREAK_MULTIPLIER = 5;
export const XP_LOGIN_STREAK_CAP = 7;

export const XP_FIRST_MATCH_OF_DAY = 30;

export const XP_REFERRAL_BONUS = 100;

/** Calculate the minimum XP required to reach a given level. */
export function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 100;
}

/** Calculate the level for a given XP amount. */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}
