/**
 * Static catalog of achievements. The list is versioned in git (no admin CRUD yet):
 * adding a new entry requires a deploy. i18n lives in apps/web/messages/{locale}.json
 * under `achievements.catalog.<id>.{title,description}`.
 *
 * The actual check logic (DB queries) lives server-side in
 * apps/server/src/services/achievement-checks.ts, keyed by the same `id`. This file
 * only describes what achievements exist, when to evaluate them, and their reward.
 */

export type AchievementTier = 'bronze' | 'silver' | 'gold';

/**
 * Triggers identify which pipeline event a given achievement should be re-evaluated
 * against. This avoids running all checks on every XP award.
 *
 * - `login`             : fired after a successful touchLogin
 * - `daily`             : fired after a daily guess (correct, participation, etc.)
 * - `multiplayer`       : fired after a multiplayer event (correct, round_played, finish)
 * - `referral`          : fired after a referrer gets their referral_bonus
 */
export type AchievementTrigger = 'login' | 'daily' | 'multiplayer' | 'referral';

export interface AchievementDefinition {
  id: string;
  tier: AchievementTier;
  /** Lucide icon name. Resolved at render time on the web (not bundled here to keep shared light). */
  icon: string;
  triggers: readonly AchievementTrigger[];
  /** Bonus XP awarded via xp_service when unlocked. */
  xpReward: number;
}

export const ACHIEVEMENTS = [
  {
    id: 'first_login',
    tier: 'bronze',
    icon: 'DoorOpen',
    triggers: ['login'],
    xpReward: 50,
  },
  {
    id: 'login_streak_7',
    tier: 'silver',
    icon: 'Flame',
    triggers: ['login'],
    xpReward: 200,
  },
  {
    id: 'first_daily',
    tier: 'bronze',
    icon: 'Headphones',
    triggers: ['daily'],
    xpReward: 50,
  },
  {
    id: 'daily_streak_7',
    tier: 'silver',
    icon: 'CalendarCheck',
    triggers: ['daily'],
    xpReward: 250,
  },
  {
    id: 'daily_phase_1',
    tier: 'gold',
    icon: 'Ear',
    triggers: ['daily'],
    xpReward: 500,
  },
  {
    id: 'mp_first_win',
    tier: 'silver',
    icon: 'Trophy',
    triggers: ['multiplayer'],
    xpReward: 150,
  },
  {
    id: 'invite_first',
    tier: 'silver',
    icon: 'UserPlus',
    triggers: ['referral'],
    xpReward: 200,
  },
  {
    id: 'invite_5',
    tier: 'gold',
    icon: 'Users',
    triggers: ['referral'],
    xpReward: 500,
  },
] as const satisfies readonly AchievementDefinition[];

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

export function getAchievementsForTrigger(
  trigger: AchievementTrigger,
): readonly AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => (a.triggers as readonly string[]).includes(trigger));
}

export function getAchievement(id: AchievementId): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
