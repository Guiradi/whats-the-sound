import {
  ARTIST_MATCH_SCORE_RATIO,
  PHASE_SCORES,
  SIMULTANEOUS_ANSWER_WINDOW_MS,
} from '../constants/index.js';

type Phase = 1 | 2 | 3 | 4;

/**
 * Calculate the score for a correct guess based on the current phase
 * and the player's position (1-indexed: 1st correct = position 1).
 */
export function calculateScore(phase: Phase, guessPosition: number): number {
  const { max, decay, floor } = PHASE_SCORES[phase];
  const raw = max - decay * (guessPosition - 1);
  return Math.max(raw, floor);
}

/**
 * Determine a player's guess position accounting for the simultaneous answer
 * window. Players who answer within SIMULTANEOUS_ANSWER_WINDOW_MS of each
 * other share the same position.
 */
export function resolveGuessPosition(existingTimestamps: number[], newTimestamp: number): number {
  if (existingTimestamps.length === 0) return 1;

  const lastTimestamp = existingTimestamps[existingTimestamps.length - 1] ?? 0;
  if (newTimestamp - lastTimestamp <= SIMULTANEOUS_ANSWER_WINDOW_MS) {
    let samePositionCount = 0;
    for (let i = existingTimestamps.length - 1; i >= 0; i--) {
      if (lastTimestamp - (existingTimestamps[i] ?? 0) <= SIMULTANEOUS_ANSWER_WINDOW_MS) {
        samePositionCount++;
      } else {
        break;
      }
    }
    return existingTimestamps.length - samePositionCount + 1;
  }

  return existingTimestamps.length + 1;
}

/**
 * Score for guessing the artist correctly (partial credit).
 * Awards ARTIST_MATCH_SCORE_RATIO of the full phase score.
 */
export function calculateArtistScore(phase: Phase, guessPosition: number): number {
  return Math.floor(calculateScore(phase, guessPosition) * ARTIST_MATCH_SCORE_RATIO);
}

/**
 * Score for guessing the title correctly.
 * If the player already earned artist points, they get the remaining portion.
 * If not, they get the full score (unchanged from before).
 */
export function calculateTitleScore(
  phase: Phase,
  guessPosition: number,
  hasArtistMatch: boolean,
): number {
  const full = calculateScore(phase, guessPosition);
  if (hasArtistMatch) {
    return Math.ceil(full * (1 - ARTIST_MATCH_SCORE_RATIO));
  }
  return full;
}
