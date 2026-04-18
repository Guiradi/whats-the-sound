import type { SupabaseClient } from '@supabase/supabase-js';
import type { AchievementId } from '@wts/shared/achievements';

/**
 * Each check returns true if the user now qualifies for the achievement.
 * Idempotency is handled upstream by the UNIQUE(user_id, achievement_id) constraint,
 * so these checks don't need to short-circuit on already-unlocked state — the INSERT
 * will no-op on conflict.
 *
 * Context carries metadata from the trigger call site (e.g. current streak from
 * loginService, phase from dailyService) so checks can avoid redundant DB roundtrips.
 */
export type AchievementCheckContext = Record<string, unknown>;

export type AchievementCheck = (
  userId: string,
  supabase: SupabaseClient,
  ctx: AchievementCheckContext,
) => Promise<boolean>;

async function firstLogin(): Promise<boolean> {
  // Fired only by touchLogin; just reaching that handler means a login happened today.
  return true;
}

async function loginStreak7(
  _userId: string,
  _supabase: SupabaseClient,
  ctx: AchievementCheckContext,
): Promise<boolean> {
  const streak = typeof ctx.streak === 'number' ? ctx.streak : 0;
  return streak >= 7;
}

async function firstDaily(userId: string, supabase: SupabaseClient): Promise<boolean> {
  const { count } = await supabase
    .from('daily_results')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true);
  return (count ?? 0) >= 1;
}

async function dailyStreak7(userId: string, supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('daily_streak')
    .eq('id', userId)
    .maybeSingle();
  const streak = (data as { daily_streak: number } | null)?.daily_streak ?? 0;
  return streak >= 7;
}

async function dailyPhase1(userId: string, supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from('daily_results')
    .select('id')
    .eq('user_id', userId)
    .eq('phase_guessed', 1)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function mpFirstWin(userId: string, supabase: SupabaseClient): Promise<boolean> {
  // game_players.user_id stores the user; final_position = 1 = first place.
  const { data } = await supabase
    .from('game_players')
    .select('id')
    .eq('user_id', userId)
    .eq('final_position', 1)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function inviteFirst(userId: string, supabase: SupabaseClient): Promise<boolean> {
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by_user_id', userId)
    .not('referral_completed_at', 'is', null);
  return (count ?? 0) >= 1;
}

async function invite5(userId: string, supabase: SupabaseClient): Promise<boolean> {
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by_user_id', userId)
    .not('referral_completed_at', 'is', null);
  return (count ?? 0) >= 5;
}

export const ACHIEVEMENT_CHECKS: Record<AchievementId, AchievementCheck> = {
  first_login: firstLogin,
  login_streak_7: loginStreak7,
  first_daily: firstDaily,
  daily_streak_7: dailyStreak7,
  daily_phase_1: dailyPhase1,
  mp_first_win: mpFirstWin,
  invite_first: inviteFirst,
  invite_5: invite5,
};
