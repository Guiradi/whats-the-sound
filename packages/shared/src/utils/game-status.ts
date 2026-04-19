import { GameStatus } from '../enums/index.js';

export const ACTIVE_PHASES: ReadonlySet<string> = new Set([
  GameStatus.PHASE_1,
  GameStatus.PHASE_2,
  GameStatus.PHASE_3,
  GameStatus.PHASE_4,
]);

export function isActivePhase(status: string): boolean {
  return ACTIVE_PHASES.has(status);
}
