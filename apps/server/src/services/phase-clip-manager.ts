import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyBaseLogger } from 'fastify';
import type { MidiEntry } from '@wts/shared';
import { clipMidiToPhase } from './midi-clipper.js';

const PHASE_CLIPS_FOLDER = 'phase-clips';
const SIGNED_URL_TTL_SECONDS = 60;
const BUCKET = 'midis';

export type PhaseClipPaths = {
  1: string;
  2: string;
  3: string;
  4: string;
};

/**
 * Server-side service that turns a canonical MIDI into 4 per-phase clips, uploads
 * each to the private storage bucket under an opaque path, and mints short-lived
 * signed URLs on demand. Replaces the previous design where the full MIDI URL was
 * sent to the client at phase 1 (anti-cheat SEC-2).
 */
export class PhaseClipManager {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: FastifyBaseLogger,
  ) {}

  /**
   * Download the source MIDI, generate 4 phase clips, upload all 4 to private storage.
   * Returns the storage paths on success, or null on any failure (clips are rolled back).
   */
  async prepareForRound(midi: MidiEntry): Promise<PhaseClipPaths | null> {
    const sourcePath = extractStoragePath(midi.midiFileUrl);
    if (!sourcePath) {
      this.logger.error(
        { midiId: midi.id, midiFileUrl: midi.midiFileUrl },
        'PhaseClipManager: could not extract storage path from midiFileUrl',
      );
      return null;
    }

    const { data: file, error: dlError } = await this.supabase.storage
      .from(BUCKET)
      .download(sourcePath);
    if (dlError || !file) {
      this.logger.error(
        { midiId: midi.id, sourcePath, err: dlError },
        'PhaseClipManager: failed to download source MIDI',
      );
      return null;
    }

    let sourceBuffer: Buffer;
    try {
      sourceBuffer = Buffer.from(await file.arrayBuffer());
    } catch (err) {
      this.logger.error({ err, midiId: midi.id }, 'PhaseClipManager: failed to read source buffer');
      return null;
    }

    const uploaded: string[] = [];
    const paths: PhaseClipPaths = { 1: '', 2: '', 3: '', 4: '' };

    for (const phaseNum of [1, 2, 3, 4] as const) {
      const phaseKey = `phase${phaseNum}` as const;
      const phaseConfig = midi.phases[phaseKey];
      let clipBuffer: Buffer;
      try {
        clipBuffer = clipMidiToPhase(sourceBuffer, phaseConfig);
      } catch (err) {
        this.logger.error(
          { err, midiId: midi.id, phase: phaseNum },
          'PhaseClipManager: failed to clip phase',
        );
        await this.deleteByPaths(uploaded);
        return null;
      }

      const clipPath = `${PHASE_CLIPS_FOLDER}/${randomUUID()}.mid`;
      const { error: upError } = await this.supabase.storage.from(BUCKET).upload(clipPath, clipBuffer, {
        contentType: 'audio/midi',
        upsert: false,
      });

      if (upError) {
        this.logger.error(
          { err: upError, midiId: midi.id, phase: phaseNum, clipPath },
          'PhaseClipManager: failed to upload phase clip',
        );
        await this.deleteByPaths(uploaded);
        return null;
      }

      paths[phaseNum] = clipPath;
      uploaded.push(clipPath);
    }

    return paths;
  }

  /**
   * Mint a signed URL for a phase clip. TTL is short by design — clients have
   * one phase duration to fetch the file; replays during the same phase use the
   * cached fetch on the client.
   */
  async getSignedUrl(path: string): Promise<string | null> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      this.logger.error({ err: error, path }, 'PhaseClipManager: failed to sign URL');
      return null;
    }
    return data.signedUrl;
  }

  /**
   * Best-effort cleanup. Errors are logged but never thrown — orphan clips are
   * a non-critical leak (storage tax) and we never want cleanup to block a turn
   * transition.
   */
  async cleanup(paths: PhaseClipPaths | null): Promise<void> {
    if (!paths) return;
    const toDelete = [paths[1], paths[2], paths[3], paths[4]].filter(Boolean);
    await this.deleteByPaths(toDelete);
  }

  private async deleteByPaths(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await this.supabase.storage.from(BUCKET).remove(paths);
    if (error) {
      this.logger.warn({ err: error, paths }, 'PhaseClipManager: failed to delete clips');
    }
  }
}

/**
 * Public URL: https://<ref>.supabase.co/storage/v1/object/public/midis/catalog/abc.mid
 * Signed URL: https://<ref>.supabase.co/storage/v1/object/sign/midis/catalog/abc.mid?token=...
 *
 * In both shapes the path is whatever follows "/midis/" up to "?".
 */
function extractStoragePath(url: string): string | null {
  const marker = '/midis/';
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  const rest = url.slice(idx + marker.length);
  const qIdx = rest.indexOf('?');
  const path = qIdx >= 0 ? rest.slice(0, qIdx) : rest;
  return path.length > 0 ? path : null;
}
