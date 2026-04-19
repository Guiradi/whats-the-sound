import { z } from 'zod';

export const categoryInfoSchema = z.object({
  name: z.string(),
  totalSongs: z.number().int().nonnegative(),
  activeSongs: z.number().int().nonnegative(),
  isDisabled: z.boolean(),
});
export type CategoryInfo = z.infer<typeof categoryInfoSchema>;

export const adminCategoriesResponseSchema = z.object({
  categories: z.array(categoryInfoSchema),
  disabledCategories: z.array(z.string()).optional(),
});
export type AdminCategoriesResponse = z.infer<typeof adminCategoriesResponseSchema>;

export const homeProfileRowSchema = z.object({
  nickname: z.string(),
  avatar_url: z.string().nullable(),
  xp: z.number().int().nonnegative(),
  level: z.number().int().nonnegative(),
  login_streak: z.number().int().nonnegative(),
  daily_streak: z.number().int().nonnegative(),
});
export type HomeProfileRow = z.infer<typeof homeProfileRowSchema>;

export const profileRowSchema = z.object({
  nickname: z.string(),
  avatar_url: z.string().nullable(),
  created_at: z.string(),
  total_games: z.number().int().nonnegative(),
  total_wins: z.number().int().nonnegative(),
  total_correct: z.number().int().nonnegative(),
  daily_streak: z.number().int().nonnegative(),
  max_daily_streak: z.number().int().nonnegative(),
  points_total: z.number().int().nonnegative(),
  level: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
  login_streak: z.number().int().nonnegative(),
  max_login_streak: z.number().int().nonnegative(),
});
export type ProfileRow = z.infer<typeof profileRowSchema>;

export const dailyStreakInfoSchema = z.object({
  currentStreak: z.number().int().nonnegative(),
  maxStreak: z.number().int().nonnegative(),
});
export type DailyStreakInfo = z.infer<typeof dailyStreakInfoSchema>;

export const dailyHistoryEntrySchema = z.object({
  date: z.string(),
  dayNumber: z.number().int(),
  midiId: z.string(),
  title: z.string(),
  artist: z.string(),
  category: z.string(),
  phaseGuessed: z.number().int().nullable(),
  completed: z.boolean(),
  isCorrect: z.boolean(),
});

export const dailyHistoryResponseSchema = z.object({
  entries: z.array(dailyHistoryEntrySchema),
  streak: dailyStreakInfoSchema,
});
export type DailyHistoryResponse = z.infer<typeof dailyHistoryResponseSchema>;
