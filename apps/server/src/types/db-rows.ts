import { z } from 'zod';

export const userXpRowSchema = z.object({
  xp: z.number().int().nonnegative(),
  level: z.number().int().nonnegative().optional(),
});
export type UserXpRow = z.infer<typeof userXpRowSchema>;

export const userGuestRowSchema = z.object({
  xp: z.number().int().nonnegative().nullable().default(0),
  is_guest: z.boolean().nullable().default(false),
});
export type UserGuestRow = z.infer<typeof userGuestRowSchema>;

export const xpEventRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  source: z.string(),
  source_ref: z.string(),
  amount: z.number().int(),
  capped: z.boolean(),
  context: z.record(z.unknown()).nullable().default({}),
  created_at: z.string(),
});
export type XpEventRow = z.infer<typeof xpEventRowSchema>;

export const dailyHistoryRowSchema = z.object({
  date: z.string(),
  midi_id: z.string(),
  phase_guessed: z.number().int().nullable(),
  completed: z.boolean(),
  midi_catalog: z.object({
    title: z.string(),
    artist: z.string(),
    category: z.string(),
  }),
});
export type DailyHistoryRow = z.infer<typeof dailyHistoryRowSchema>;

export const userLoginRowSchema = z.object({
  last_login_date: z.string().nullable(),
  login_streak: z.number().int().nonnegative(),
  max_login_streak: z.number().int().nonnegative(),
});
export type UserLoginRow = z.infer<typeof userLoginRowSchema>;

export const userStreakRowSchema = z.object({
  daily_streak: z.number().int().nonnegative(),
});
export type UserStreakRow = z.infer<typeof userStreakRowSchema>;

export const dailyResultRowSchema = z.object({
  completed: z.boolean(),
  phase_guessed: z.number().int().nullable(),
  attempts: z.array(z.unknown()).nullable(),
  midi_id: z.string(),
});
export type DailyResultRow = z.infer<typeof dailyResultRowSchema>;

export const achievementInsertRowSchema = z.object({
  id: z.string(),
  unlocked_at: z.string(),
});
export type AchievementInsertRow = z.infer<typeof achievementInsertRowSchema>;

export const userAchievementRowSchema = z.object({
  achievement_id: z.string(),
  unlocked_at: z.string(),
});
export type UserAchievementRow = z.infer<typeof userAchievementRowSchema>;

export const userReferralStateRowSchema = z.object({
  referred_by_user_id: z.string().nullable(),
  referral_completed_at: z.string().nullable(),
});
export type UserReferralStateRow = z.infer<typeof userReferralStateRowSchema>;

export const userReferralSelfRowSchema = z.object({
  referred_by_user_id: z.string().nullable(),
  referral_code: z.string().nullable(),
});
export type UserReferralSelfRow = z.infer<typeof userReferralSelfRowSchema>;

export const userIdRowSchema = z.object({
  id: z.string(),
});
export type UserIdRow = z.infer<typeof userIdRowSchema>;

export const userReferralCodeRowSchema = z.object({
  referral_code: z.string().nullable(),
});
export type UserReferralCodeRow = z.infer<typeof userReferralCodeRowSchema>;

export const inviteeRowSchema = z.object({
  id: z.string(),
  referral_completed_at: z.string().nullable(),
});
export type InviteeRow = z.infer<typeof inviteeRowSchema>;

export const disabledCategoriesSchema = z.array(z.string());
