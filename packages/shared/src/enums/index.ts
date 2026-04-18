export const MidiCategory = {
  ROCK: 'rock',
  POP: 'pop',
  MPB: 'mpb',
  SERTANEJO: 'sertanejo',
  GAMES: 'games',
  ANIME: 'anime',
  CLASSICAL: 'classical',
  ELECTRONIC: 'electronic',
  HIPHOP: 'hiphop',
} as const;
export type MidiCategory = (typeof MidiCategory)[keyof typeof MidiCategory];

export const MidiDifficulty = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;
export type MidiDifficulty = (typeof MidiDifficulty)[keyof typeof MidiDifficulty];

export const GameStatus = {
  LOBBY: 'LOBBY',
  ROUND_START: 'ROUND_START',
  PHASE_1: 'PHASE_1',
  PHASE_2: 'PHASE_2',
  PHASE_3: 'PHASE_3',
  PHASE_4: 'PHASE_4',
  ROUND_END: 'ROUND_END',
  GAME_END: 'GAME_END',
} as const;
export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

export const GuessResult = {
  CORRECT: 'correct',
  HOT: 'hot',
  WARM: 'warm',
  ARTIST_MATCH: 'artist_match',
  WRONG: 'wrong',
} as const;
export type GuessResult = (typeof GuessResult)[keyof typeof GuessResult];

export const UserRole = {
  PLAYER: 'player',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const XpSourceEnum = {
  MULTIPLAYER_CORRECT: 'multiplayer_correct',
  MULTIPLAYER_FINISH: 'multiplayer_finish',
  DAILY_CORRECT: 'daily_correct',
  DAILY_PARTICIPATION: 'daily_participation',
  DAILY_STREAK_BONUS: 'daily_streak_bonus',
} as const;
export type XpSourceEnum = (typeof XpSourceEnum)[keyof typeof XpSourceEnum];
