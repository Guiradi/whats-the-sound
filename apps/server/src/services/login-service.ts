import type { SupabaseClient } from '@supabase/supabase-js';
import { diffBRTDays, getTodayBRT } from '@wts/shared';
import {
  XP_DAILY_LOGIN,
  XP_LOGIN_STREAK_CAP,
  XP_LOGIN_STREAK_MULTIPLIER,
} from '@wts/shared/constants';
import { userLoginRowSchema } from '../types/db-rows.js';
import type { AchievementService } from './achievement-service.js';
import type { XpService } from './xp-service.js';

export interface TouchLoginResult {
  touched: boolean;
  streak: number;
  maxStreak: number;
  xpAwarded: number;
}

export function createLoginService(
  supabase: SupabaseClient,
  xpService?: XpService,
  achievementService?: AchievementService,
) {
  /**
   * Records a login for the given user for today (BRT), updating login_streak and
   * max_login_streak, and awarding daily_login + login_streak_bonus XP.
   *
   * Idempotent per BRT day: calling twice on the same day returns `touched: false` and
   * does nothing. The XP service itself is also idempotent via source_ref.
   */
  async function touchLogin(userId: string): Promise<TouchLoginResult> {
    if (!userId || userId.startsWith('guest:')) {
      return { touched: false, streak: 0, maxStreak: 0, xpAwarded: 0 };
    }

    const today = getTodayBRT();

    const { data: userRow, error: fetchErr } = await supabase
      .from('users')
      .select('last_login_date, login_streak, max_login_streak')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr || !userRow) {
      return { touched: false, streak: 0, maxStreak: 0, xpAwarded: 0 };
    }

    const parsedRow = userLoginRowSchema.safeParse(userRow);
    if (!parsedRow.success) {
      return { touched: false, streak: 0, maxStreak: 0, xpAwarded: 0 };
    }
    const row = parsedRow.data;

    if (row.last_login_date === today) {
      return {
        touched: false,
        streak: row.login_streak,
        maxStreak: row.max_login_streak,
        xpAwarded: 0,
      };
    }

    // Compute new streak: +1 if the last login was exactly yesterday, else reset to 1.
    let newStreak = 1;
    if (row.last_login_date) {
      const delta = diffBRTDays(today, row.last_login_date);
      if (delta === 1) {
        newStreak = row.login_streak + 1;
      }
    }
    const newMax = Math.max(row.max_login_streak, newStreak);

    const { error: updateErr } = await supabase
      .from('users')
      .update({
        last_login_date: today,
        login_streak: newStreak,
        max_login_streak: newMax,
      })
      .eq('id', userId);

    if (updateErr) {
      return {
        touched: false,
        streak: row.login_streak,
        maxStreak: row.max_login_streak,
        xpAwarded: 0,
      };
    }

    // Award XP. Both events are idempotent per BRT day via source_ref.
    let xpAwarded = 0;
    if (xpService) {
      const loginResult = await xpService.awardXp({
        userId,
        source: 'daily_login',
        sourceRef: `login_${today}_${userId}`,
        amount: XP_DAILY_LOGIN,
        context: { date: today, streak: newStreak },
      });
      xpAwarded += loginResult.xpGained;

      if (newStreak >= 2) {
        const streakAmount = XP_LOGIN_STREAK_MULTIPLIER * Math.min(newStreak, XP_LOGIN_STREAK_CAP);
        const streakResult = await xpService.awardXp({
          userId,
          source: 'login_streak_bonus',
          sourceRef: `login_streak_${today}_${userId}`,
          amount: streakAmount,
          context: { date: today, streak: newStreak },
        });
        xpAwarded += streakResult.xpGained;
      }
    }

    // Fire-and-forget achievement evaluation. Never block the response.
    if (achievementService) {
      setImmediate(() => {
        achievementService
          .checkAchievements(userId, 'login', { streak: newStreak })
          .catch(() => {});
      });
    }

    return {
      touched: true,
      streak: newStreak,
      maxStreak: newMax,
      xpAwarded,
    };
  }

  return { touchLogin };
}

export type LoginService = ReturnType<typeof createLoginService>;
