import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ACHIEVEMENTS,
  type AchievementDefinition,
  type AchievementId,
  type AchievementTrigger,
  getAchievementsForTrigger,
} from '@wts/shared/achievements';
import { z } from 'zod';
import type { TypedServer } from '../socket/index.js';
import { achievementInsertRowSchema, userAchievementRowSchema } from '../types/db-rows.js';
import { ACHIEVEMENT_CHECKS, type AchievementCheckContext } from './achievement-checks.js';
import type { XpService } from './xp-service.js';

const unlockedListSchema = z.array(userAchievementRowSchema);

export function createAchievementService(supabase: SupabaseClient, xpService: XpService) {
  let io: TypedServer | null = null;

  function setIo(server: TypedServer): void {
    io = server;
  }

  function emitUnlock(userId: string, payload: unknown) {
    if (!io) return;
    try {
      // biome-ignore lint/suspicious/noExplicitAny: socket.io's emit is dynamically typed here
      (io.to(`user:${userId}`).emit as any)('achievement:unlocked', payload);
    } catch {
      // Fire-and-forget: socket failures must never break unlock persistence.
    }
  }

  async function tryUnlock(
    userId: string,
    achievement: AchievementDefinition,
    ctx: AchievementCheckContext,
  ): Promise<void> {
    const check = ACHIEVEMENT_CHECKS[achievement.id as AchievementId];
    if (!check) return;

    let qualifies = false;
    try {
      qualifies = await check(userId, supabase, ctx);
    } catch {
      return;
    }
    if (!qualifies) return;

    // INSERT with UNIQUE(user_id, achievement_id) — Supabase returns no row on conflict,
    // so we only proceed with reward/emit when the row was actually inserted.
    const { data: inserted, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievement.id,
        context: ctx ?? {},
      })
      .select('id, unlocked_at')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') return;
      return;
    }
    if (!inserted) return;

    const parsedInsert = achievementInsertRowSchema.safeParse(inserted);
    if (!parsedInsert.success) return;
    const unlockedAt = parsedInsert.data.unlocked_at;

    // Award bonus XP via the existing pipeline. xp_events source_ref is stable,
    // so even if this code runs twice somehow, XP is awarded exactly once.
    if (achievement.xpReward > 0) {
      await xpService.awardXp({
        userId,
        source: 'achievement_unlocked',
        sourceRef: `ach_${achievement.id}_${userId}`,
        amount: achievement.xpReward,
        context: { achievementId: achievement.id, tier: achievement.tier },
      });
    }

    emitUnlock(userId, {
      achievementId: achievement.id,
      tier: achievement.tier,
      xpReward: achievement.xpReward,
      unlockedAt,
    });
  }

  /**
   * Evaluate the subset of achievements tied to the given trigger and unlock those
   * the user now qualifies for. Idempotent via DB UNIQUE + xp_events source_ref.
   *
   * Call fire-and-forget (setImmediate) from the hot path — failures are swallowed.
   */
  async function checkAchievements(
    userId: string,
    trigger: AchievementTrigger,
    ctx: AchievementCheckContext = {},
  ): Promise<void> {
    if (!userId || userId.startsWith('guest:')) return;

    const candidates = getAchievementsForTrigger(trigger);
    for (const achievement of candidates) {
      await tryUnlock(userId, achievement, ctx);
    }
  }

  async function listUnlockedForUser(
    userId: string,
  ): Promise<Array<{ achievementId: string; unlockedAt: string }>> {
    const { data } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    const parsed = unlockedListSchema.safeParse(data ?? []);
    if (!parsed.success) return [];
    return parsed.data.map((row) => ({
      achievementId: row.achievement_id,
      unlockedAt: row.unlocked_at,
    }));
  }

  return {
    checkAchievements,
    listUnlockedForUser,
    setIo,
    catalog: ACHIEVEMENTS,
  };
}

export type AchievementService = ReturnType<typeof createAchievementService>;
