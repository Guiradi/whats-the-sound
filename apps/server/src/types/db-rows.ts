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
