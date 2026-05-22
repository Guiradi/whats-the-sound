import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MidiCategory, MidiDifficulty } from '@wts/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAdminPreHandler } from '../middleware/admin-guard.js';
import type { AuthResolver } from '../middleware/auth.js';
import { analyzeMidi } from '../services/midi-analyzer.js';

const phaseConfigSchema = z.object({
  startBeat: z.number().min(0),
  endBeat: z.number().min(0),
});

const phasesSchema = z.object({
  phase1: phaseConfigSchema,
  phase2: phaseConfigSchema,
  phase3: phaseConfigSchema,
  phase4: phaseConfigSchema,
});

const midiCategoryValues = Object.values(MidiCategory) as [string, ...string[]];
const midiDifficultyValues = Object.values(MidiDifficulty) as [string, ...string[]];

const createMidiSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  category: z.enum(midiCategoryValues),
  difficulty: z.enum(midiDifficultyValues),
  year: z.number().int().min(1900).max(2030).nullable().optional(),
  midiFileUrl: z.string().url(),
  acceptedTitles: z.array(z.string().min(1)).min(1),
  acceptedArtists: z.array(z.string().min(1)).min(1),
  phases: phasesSchema,
});

const updateMidiSchema = createMidiSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const listQuerySchema = z.object({
  category: z.enum(midiCategoryValues).optional(),
  difficulty: z.enum(midiDifficultyValues).optional(),
  search: z.string().max(200).optional(),
  activeOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .default('true'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z
    .enum(['title', 'artist', 'category', 'difficulty', 'play_count', 'correct_rate', 'created_at'])
    .optional()
    .default('created_at'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

export function createCatalogRoutes(supabase: SupabaseClient, auth: AuthResolver) {
  const adminOnly = { preHandler: createAdminPreHandler(supabase, auth) };

  return async function catalogRoutes(server: FastifyInstance) {
    /**
     * GET /api/catalog — List MIDI catalog entries with filters.
     * Admin-only.
     */
    server.get('/api/catalog', adminOnly, async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parsed.error.issues[0]?.message ?? 'Invalid query',
          },
        });
      }

      const { category, difficulty, search, activeOnly, limit, offset, sortBy, sortDir } =
        parsed.data;

      try {
        let query = supabase.from('midi_catalog').select('*', { count: 'exact' });

        if (activeOnly) {
          query = query.eq('is_active', true);
        }
        if (category) {
          query = query.eq('category', category);
        }
        if (difficulty) {
          query = query.eq('difficulty', difficulty);
        }
        if (search) {
          query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
        }

        query = query.order(sortBy, { ascending: sortDir === 'asc' });
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          request.log.error(error, 'Failed to list catalog');
          return reply.status(500).send({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to list catalog' },
          });
        }

        return { items: data ?? [], total: count ?? 0 };
      } catch (err) {
        request.log.error(err, 'Failed to list catalog');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to list catalog' },
        });
      }
    });

    /**
     * GET /api/catalog/:id — Get a single MIDI entry.
     * Admin-only.
     */
    server.get('/api/catalog/:id', adminOnly, async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const { data, error } = await supabase
          .from('midi_catalog')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          request.log.error(error, 'Failed to get catalog entry');
          return reply.status(500).send({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to get catalog entry' },
          });
        }
        if (!data) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'MIDI not found' },
          });
        }

        return data;
      } catch (err) {
        request.log.error(err, 'Failed to get catalog entry');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get catalog entry' },
        });
      }
    });

    /**
     * POST /api/catalog — Create a new MIDI entry.
     * Admin-only.
     */
    server.post('/api/catalog', adminOnly, async (request, reply) => {
      const parsed = createMidiSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
          },
        });
      }

      const { midiFileUrl, acceptedTitles, acceptedArtists, ...rest } = parsed.data;

      try {
        const { data, error } = await supabase
          .from('midi_catalog')
          .insert({
            ...rest,
            midi_file_url: midiFileUrl,
            accepted_titles: acceptedTitles,
            accepted_artists: acceptedArtists,
          })
          .select()
          .single();

        if (error) {
          request.log.error(error, 'Failed to create catalog entry');
          return reply.status(500).send({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to create catalog entry' },
          });
        }

        return reply.status(201).send(data);
      } catch (err) {
        request.log.error(err, 'Failed to create catalog entry');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create catalog entry' },
        });
      }
    });

    /**
     * PATCH /api/catalog/:id — Update a MIDI entry.
     * Admin-only.
     */
    server.patch('/api/catalog/:id', adminOnly, async (request, reply) => {
      const { id } = request.params as { id: string };

      const parsed = updateMidiSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
          },
        });
      }

      const { midiFileUrl, acceptedTitles, acceptedArtists, isActive, ...rest } = parsed.data;

      const updateData: Record<string, unknown> = { ...rest };
      if (midiFileUrl !== undefined) updateData.midi_file_url = midiFileUrl;
      if (acceptedTitles !== undefined) updateData.accepted_titles = acceptedTitles;
      if (acceptedArtists !== undefined) updateData.accepted_artists = acceptedArtists;
      if (isActive !== undefined) updateData.is_active = isActive;

      try {
        const { data, error } = await supabase
          .from('midi_catalog')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          request.log.error(error, 'Failed to update catalog entry');
          return reply.status(500).send({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to update catalog entry' },
          });
        }

        return data;
      } catch (err) {
        request.log.error(err, 'Failed to update catalog entry');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to update catalog entry' },
        });
      }
    });

    /**
     * DELETE /api/catalog/:id — Delete a MIDI entry.
     * Without ?permanent=true: soft-delete (set is_active = false).
     * With ?permanent=true: hard-delete (remove from DB + Storage).
     * Admin-only.
     */
    server.delete('/api/catalog/:id', adminOnly, async (request, reply) => {
      const { id } = request.params as { id: string };
      const { permanent } = request.query as { permanent?: string };

      try {
        if (permanent === 'true') {
          // Fetch entry to get the MIDI file URL for Storage cleanup
          const { data: entry } = await supabase
            .from('midi_catalog')
            .select('midi_file_url')
            .eq('id', id)
            .single();

          // Delete dependent rows that reference this MIDI entry
          await supabase.from('daily_results').delete().eq('midi_id', id);
          await supabase.from('daily_schedule').delete().eq('midi_id', id);
          await supabase.from('round_scores').delete().eq('midi_id', id);

          // Hard-delete from DB
          const { error } = await supabase.from('midi_catalog').delete().eq('id', id);

          if (error) {
            request.log.error(error, 'Failed to delete catalog entry');
            return reply.status(500).send({
              error: { code: 'INTERNAL_ERROR', message: 'Failed to delete catalog entry' },
            });
          }

          // Clean up MIDI file from Storage
          if (entry?.midi_file_url) {
            const path = entry.midi_file_url.split('/midis/').pop();
            if (path) {
              await supabase.storage.from('midis').remove([path]);
            }
          }

          return { deleted: true };
        }

        // Soft-delete: deactivate
        const { data, error } = await supabase
          .from('midi_catalog')
          .update({ is_active: false })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          request.log.error(error, 'Failed to deactivate catalog entry');
          return reply.status(500).send({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate catalog entry' },
          });
        }

        return data;
      } catch (err) {
        request.log.error(err, 'Failed to delete catalog entry');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to delete catalog entry' },
        });
      }
    });

    /**
     * POST /api/catalog/upload — Upload a MIDI file to Supabase Storage.
     * Returns the public URL. Admin-only.
     */
    server.post('/api/catalog/upload', adminOnly, async (request, reply) => {
      try {
        const body = request.body as { fileName: string; fileBase64: string };
        if (!body.fileName || !body.fileBase64) {
          return reply.status(400).send({
            error: { code: 'BAD_REQUEST', message: 'fileName and fileBase64 are required' },
          });
        }

        const rawBuffer = Buffer.from(body.fileBase64, 'base64');

        // Analyze MIDI: trim silence, count measures, validate, compute phases
        const result = analyzeMidi(rawBuffer);
        if (!result.ok) {
          return reply.status(400).send({
            error: { code: 'MIDI_ANALYSIS_FAILED', message: result.error.message },
          });
        }

        // Upload the analyzed buffer. Use an opaque path so the original filename
        // (often containing the song title) is never reachable via the storage URL.
        const filePath = `catalog/${randomUUID()}.mid`;
        const { error: uploadError } = await supabase.storage
          .from('midis')
          .upload(filePath, result.buffer, {
            contentType: 'audio/midi',
            upsert: false,
          });

        if (uploadError) {
          request.log.error(uploadError, 'Failed to upload MIDI file');
          return reply.status(500).send({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to upload file' },
          });
        }

        const { data: urlData } = supabase.storage.from('midis').getPublicUrl(filePath);

        return {
          url: urlData.publicUrl,
          path: filePath,
          analysis: result.analysis,
        };
      } catch (err) {
        request.log.error(err, 'Failed to upload MIDI file');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to upload file' },
        });
      }
    });
  };
}
