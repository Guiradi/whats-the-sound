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

export const adminStatsSchema = z.object({
  users: z.object({
    total: z.number().int().nonnegative(),
    registered: z.number().int().nonnegative(),
    guests: z.number().int().nonnegative(),
    admins: z.number().int().nonnegative(),
  }),
  games: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    finished: z.number().int().nonnegative(),
    waiting: z.number().int().nonnegative(),
  }),
  daily: z.object({
    totalPlayed: z.number().int().nonnegative(),
    totalCompleted: z.number().int().nonnegative(),
  }),
  catalog: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    inactive: z.number().int().nonnegative(),
    byDifficulty: z.object({
      easy: z.number().int().nonnegative(),
      medium: z.number().int().nonnegative(),
      hard: z.number().int().nonnegative(),
    }),
    byCategory: z.record(
      z.object({
        total: z.number().int().nonnegative(),
        active: z.number().int().nonnegative(),
      }),
    ),
  }),
});
export type AdminStats = z.infer<typeof adminStatsSchema>;

export const catalogItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  category: z.string(),
  difficulty: z.string(),
  play_count: z.number().int().nonnegative(),
  correct_rate: z.number(),
  is_active: z.boolean(),
  midi_file_url: z.string(),
});
export type CatalogItem = z.infer<typeof catalogItemSchema>;

export const catalogListResponseSchema = z.object({
  items: z.array(catalogItemSchema),
  total: z.number().int().nonnegative(),
});
export type CatalogListResponse = z.infer<typeof catalogListResponseSchema>;
