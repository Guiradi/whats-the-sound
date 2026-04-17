export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const MAX_PLAYERS_PER_ROOM = 20;
export const MIN_PLAYERS_PER_ROOM = 2;
export const DEFAULT_MAX_PLAYERS = 12;

export const ALLOWED_ROUND_COUNTS = [5, 10, 15] as const;
export const DEFAULT_ROUND_COUNT = 10;

export const ALLOWED_PHASE_DURATIONS_SEC = [15, 20, 30] as const;
export const DEFAULT_PHASE_DURATION_SEC = 20;

export const TOTAL_PHASES = 4;

export const PHASE_SCORES = {
  1: { max: 1000, decay: 100, floor: 300 },
  2: { max: 750, decay: 75, floor: 225 },
  3: { max: 500, decay: 50, floor: 150 },
  4: { max: 250, decay: 25, floor: 100 },
} as const;

export const SIMULTANEOUS_ANSWER_WINDOW_MS = 50;

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
