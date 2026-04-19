import type { SupabaseClient } from '@supabase/supabase-js';
import { MidiCategory } from '@wts/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAdminPreHandler } from '../middleware/admin-guard.js';
import type { AuthResolver } from '../middleware/auth.js';
import { disabledCategoriesSchema } from '../types/db-rows.js';

function readDisabledCategories(value: unknown): string[] {
  const parsed = disabledCategoriesSchema.safeParse(value ?? []);
  return parsed.success ? parsed.data : [];
}

const midiCategoryValues = Object.values(MidiCategory) as [string, ...string[]];

const categoryActionSchema = z.object({
  category: z.enum(midiCategoryValues),
});

export function createAdminRoutes(supabase: SupabaseClient, auth: AuthResolver) {
  const adminOnly = { preHandler: createAdminPreHandler(supabase, auth) };

  return async function adminRoutes(server: FastifyInstance) {
    /**
     * GET /api/admin/disabled-categories — Public endpoint returning disabled category slugs.
     * Used by room creation form to filter out unavailable categories.
     */
    server.get('/api/admin/disabled-categories', async (_request, reply) => {
      try {
        const { data } = await supabase
          .from('admin_config')
          .select('value')
          .eq('key', 'disabled_categories')
          .maybeSingle();

        return { disabledCategories: readDisabledCategories(data?.value) };
      } catch (err) {
        _request.log.error(err, 'Failed to fetch disabled categories');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch disabled categories' },
        });
      }
    });

    /**
     * GET /api/admin/stats — Dashboard statistics.
     * Admin-only.
     */
    server.get('/api/admin/stats', adminOnly, async (request, reply) => {
      try {
        // Run all queries in parallel
        const [usersResult, gamesResult, dailyResult, catalogResult, catalogByCategoryResult] =
          await Promise.all([
            // Users stats
            supabase
              .from('users')
              .select('role, is_guest', { count: 'exact' }),
            // Game sessions stats
            supabase
              .from('game_sessions')
              .select('status', { count: 'exact' }),
            // Daily results stats
            supabase
              .from('daily_results')
              .select('completed', { count: 'exact' }),
            // Catalog stats
            supabase
              .from('midi_catalog')
              .select('is_active, difficulty', { count: 'exact' }),
            // Catalog by category (with counts)
            supabase
              .from('midi_catalog')
              .select('category, is_active'),
          ]);

        // Process users
        const users = usersResult.data ?? [];
        const totalUsers = users.length;
        const totalGuests = users.filter((u) => u.is_guest).length;
        const totalAdmins = users.filter((u) => u.role === 'admin').length;
        const totalRegistered = totalUsers - totalGuests;

        // Process games
        const games = gamesResult.data ?? [];
        const totalGames = games.length;
        const gamesActive = games.filter((g) => g.status === 'playing').length;
        const gamesFinished = games.filter((g) => g.status === 'finished').length;
        const gamesWaiting = games.filter((g) => g.status === 'waiting').length;

        // Process daily
        const dailyResults = dailyResult.data ?? [];
        const totalDailyPlayed = dailyResults.length;
        const totalDailyCompleted = dailyResults.filter((d) => d.completed).length;

        // Process catalog
        const catalog = catalogResult.data ?? [];
        const totalSongs = catalog.length;
        const activeSongs = catalog.filter((c) => c.is_active).length;
        const inactiveSongs = totalSongs - activeSongs;
        const byDifficulty = {
          easy: catalog.filter((c) => c.difficulty === 'easy' && c.is_active).length,
          medium: catalog.filter((c) => c.difficulty === 'medium' && c.is_active).length,
          hard: catalog.filter((c) => c.difficulty === 'hard' && c.is_active).length,
        };

        // Process catalog by category
        const catalogByCategory = catalogByCategoryResult.data ?? [];
        const categoryStats: Record<string, { total: number; active: number }> = {};
        for (const cat of Object.values(MidiCategory)) {
          categoryStats[cat] = { total: 0, active: 0 };
        }
        for (const entry of catalogByCategory) {
          const cat = entry.category as string;
          if (categoryStats[cat]) {
            categoryStats[cat].total++;
            if (entry.is_active) {
              categoryStats[cat].active++;
            }
          }
        }

        return {
          users: {
            total: totalUsers,
            registered: totalRegistered,
            guests: totalGuests,
            admins: totalAdmins,
          },
          games: {
            total: totalGames,
            active: gamesActive,
            finished: gamesFinished,
            waiting: gamesWaiting,
          },
          daily: {
            totalPlayed: totalDailyPlayed,
            totalCompleted: totalDailyCompleted,
          },
          catalog: {
            total: totalSongs,
            active: activeSongs,
            inactive: inactiveSongs,
            byDifficulty,
            byCategory: categoryStats,
          },
        };
      } catch (err) {
        request.log.error(err, 'Failed to fetch admin stats');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' },
        });
      }
    });

    /**
     * GET /api/admin/categories — List categories with song counts and disabled status.
     * Admin-only.
     */
    server.get('/api/admin/categories', adminOnly, async (request, reply) => {
      try {
        const [catalogResult, configResult] = await Promise.all([
          supabase.from('midi_catalog').select('category, is_active'),
          supabase
            .from('admin_config')
            .select('value')
            .eq('key', 'disabled_categories')
            .maybeSingle(),
        ]);

        const catalogData = catalogResult.data ?? [];
        const disabledCategories = readDisabledCategories(configResult.data?.value);

        const categories = Object.values(MidiCategory).map((cat) => {
          const entries = catalogData.filter((e) => e.category === cat);
          return {
            name: cat,
            totalSongs: entries.length,
            activeSongs: entries.filter((e) => e.is_active).length,
            isDisabled: disabledCategories.includes(cat),
          };
        });

        return { categories, disabledCategories };
      } catch (err) {
        request.log.error(err, 'Failed to fetch categories');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch categories' },
        });
      }
    });

    /**
     * PATCH /api/admin/categories/:category/disable — Disable a category.
     * Admin-only.
     */
    server.patch('/api/admin/categories/:category/disable', adminOnly, async (request, reply) => {
      const parsed = categoryActionSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid category' },
        });
      }

      const { category } = parsed.data;

      try {
        const { data: config } = await supabase
          .from('admin_config')
          .select('value')
          .eq('key', 'disabled_categories')
          .maybeSingle();

        const current = readDisabledCategories(config?.value);
        if (!current.includes(category)) {
          current.push(category);
        }

        const { error } = await supabase.from('admin_config').upsert({
          key: 'disabled_categories',
          value: current,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          request.log.error(error, 'Failed to disable category');
          return reply.status(500).send({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to disable category' },
          });
        }

        return { success: true, disabledCategories: current };
      } catch (err) {
        request.log.error(err, 'Failed to disable category');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to disable category' },
        });
      }
    });

    /**
     * PATCH /api/admin/categories/:category/enable — Enable a category.
     * Admin-only.
     */
    server.patch('/api/admin/categories/:category/enable', adminOnly, async (request, reply) => {
      const parsed = categoryActionSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid category' },
        });
      }

      const { category } = parsed.data;

      try {
        const { data: config } = await supabase
          .from('admin_config')
          .select('value')
          .eq('key', 'disabled_categories')
          .maybeSingle();

        const current = readDisabledCategories(config?.value);
        const updated = current.filter((c) => c !== category);

        const { error } = await supabase.from('admin_config').upsert({
          key: 'disabled_categories',
          value: updated,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          request.log.error(error, 'Failed to enable category');
          return reply.status(500).send({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to enable category' },
          });
        }

        return { success: true, disabledCategories: updated };
      } catch (err) {
        request.log.error(err, 'Failed to enable category');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to enable category' },
        });
      }
    });
  };
}
