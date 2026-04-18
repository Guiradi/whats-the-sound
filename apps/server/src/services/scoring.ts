import { PHASE_SCORES, SIMULTANEOUS_ANSWER_WINDOW_MS } from '@wts/shared';

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

  // Group by simultaneous window: if the new timestamp is within the window
  // of the last answer, they share the same position.
  const lastTimestamp = existingTimestamps[existingTimestamps.length - 1] ?? 0;
  if (newTimestamp - lastTimestamp <= SIMULTANEOUS_ANSWER_WINDOW_MS) {
    // Count how many players share the last position
    let samePositionCount = 0;
    for (let i = existingTimestamps.length - 1; i >= 0; i--) {
      if (lastTimestamp - (existingTimestamps[i] ?? 0) <= SIMULTANEOUS_ANSWER_WINDOW_MS) {
        samePositionCount++;
      } else {
        break;
      }
    }
    // They get the same position as the group
    return existingTimestamps.length - samePositionCount + 1;
  }

  return existingTimestamps.length + 1;
}
