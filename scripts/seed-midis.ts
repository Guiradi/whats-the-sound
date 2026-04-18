/**
 * Seed script for MIDI catalog.
 * Reads midi-manifest.json and upserts entries into Supabase midi_catalog table.
 *
 * Usage: pnpm seed:midis
 *
 * Note: This script seeds metadata only. MIDI files (.mid) must be uploaded
 * separately to Supabase Storage bucket 'midis'. The midi_file_url in the
 * manifest should point to the correct storage path once uploaded.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ManifestEntry {
  id: string;
  title: string;
  artist: string;
  category: string;
  difficulty: string;
  year?: number;
  filename: string;
  acceptedTitles: string[];
  acceptedArtists: string[];
  phases: {
    phase1: { tracks: number[]; startBeat: number; endBeat: number; description: string };
    phase2: { tracks: number[]; startBeat: number; endBeat: number; description: string };
    phase3: { tracks: number[]; startBeat: number; endBeat: number; description: string };
    phase4: { tracks: number[]; startBeat: number; endBeat: number; description: string };
  };
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables.');
    console.error('Set them in apps/server/.env.local or pass via environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Read manifest
  const manifestPath = join(__dirname, 'midi-manifest.json');
  const manifest: ManifestEntry[] = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  console.log(`Seeding ${manifest.length} MIDI entries...`);

  let successCount = 0;
  let errorCount = 0;

  for (const entry of manifest) {
    // Build the storage URL for the MIDI file
    const storagePath = `catalog/${entry.filename}`;
    const { data: storageUrl } = supabase.storage.from('midis').getPublicUrl(storagePath);

    const row = {
      id: entry.id,
      title: entry.title,
      artist: entry.artist,
      category: entry.category,
      difficulty: entry.difficulty,
      year: entry.year ?? null,
      midi_file_url: storageUrl.publicUrl,
      accepted_titles: entry.acceptedTitles,
      accepted_artists: entry.acceptedArtists,
      phases: entry.phases,
      is_active: true,
    };

    const { error } = await supabase.from('midi_catalog').upsert(row, { onConflict: 'id' });

    if (error) {
      console.error(`  [FAIL] ${entry.title} — ${error.message}`);
      errorCount++;
    } else {
      console.log(`  [OK] ${entry.title} (${entry.category})`);
      successCount++;
    }
  }

  console.log(
    `\nDone: ${successCount} succeeded, ${errorCount} failed out of ${manifest.length} total.`,
  );

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
