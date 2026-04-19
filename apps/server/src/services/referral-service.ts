import type { SupabaseClient } from '@supabase/supabase-js';
import { XP_REFERRAL_BONUS } from '@wts/shared/constants';
import { userReferralStateRowSchema } from '../types/db-rows.js';
import type { AchievementService } from './achievement-service.js';
import type { XpService } from './xp-service.js';

export function createReferralService(
  supabase: SupabaseClient,
  xpService: XpService,
  achievementService?: AchievementService,
) {
  /**
   * Called whenever a user completes their first relevant match (daily or multiplayer).
   * If the user was referred and the reward hasn't fired yet, stamps referral_completed_at
   * and awards the referrer. Safe to call on every match completion — idempotent via
   * referral_completed_at check + xp-service source_ref uniqueness.
   */
  async function maybeRewardReferrer(invitedUserId: string): Promise<void> {
    if (!invitedUserId || invitedUserId.startsWith('guest:')) return;

    const { data: row, error } = await supabase
      .from('users')
      .select('referred_by_user_id, referral_completed_at')
      .eq('id', invitedUserId)
      .maybeSingle();

    if (error || !row) return;

    const parsed = userReferralStateRowSchema.safeParse(row);
    if (!parsed.success) return;
    const state = parsed.data;

    if (!state.referred_by_user_id || state.referral_completed_at) return;

    // Stamp referral_completed_at only if it's still null, to guarantee single reward
    // even if two match completions race (DB update is the serialization point).
    const { data: updated } = await supabase
      .from('users')
      .update({ referral_completed_at: new Date().toISOString() })
      .eq('id', invitedUserId)
      .is('referral_completed_at', null)
      .select('id')
      .maybeSingle();

    if (!updated) return;

    await xpService.awardXp({
      userId: state.referred_by_user_id,
      source: 'referral_bonus',
      sourceRef: `referral_${invitedUserId}`,
      amount: XP_REFERRAL_BONUS,
      context: { invitedUserId },
    });

    // Fire-and-forget achievement evaluation on the referrer (invite_first, invite_5).
    if (achievementService) {
      const referrerId = state.referred_by_user_id;
      setImmediate(() => {
        achievementService
          .checkAchievements(referrerId, 'referral', { invitedUserId })
          .catch(() => {});
      });
    }
  }

  return { maybeRewardReferrer };
}

export type ReferralService = ReturnType<typeof createReferralService>;
