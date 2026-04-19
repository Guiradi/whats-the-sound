import type { SupabaseClient } from '@supabase/supabase-js';
import type { MidiCategory, MidiEntry, MidiPhases } from '@wts/shared';
import type { MidiProvider } from './midi-provider.js';

interface MidiCatalogRow {
  id: string;
  title: string;
  artist: string;
  category: MidiCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  year: number | null;
  midi_file_url: string;
  accepted_titles: string[];
  accepted_artists: string[];
  phases: MidiPhases;
  is_active: boolean;
  play_count: number;
  correct_rate: number;
}

function rowToEntry(row: MidiCatalogRow): MidiEntry {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    category: row.category,
    difficulty: row.difficulty,
    year: row.year ?? undefined,
    midiFileUrl: row.midi_file_url,
    acceptedTitles: row.accepted_titles,
    acceptedArtists: row.accepted_artists,
    phases: row.phases,
    isActive: row.is_active,
    playCount: row.play_count,
    correctRate: row.correct_rate,
  };
}

/**
 * Production MidiProvider backed by Supabase `midi_catalog` table.
 */
export class SupabaseMidiProvider implements MidiProvider {
  constructor(private readonly supabase: SupabaseClient) {}

  async getMidis(category: MidiCategory | 'random', count: number): Promise<MidiEntry[]> {
    let query = this.supabase.from('midi_catalog').select('*').eq('is_active', true);

    if (category !== 'random') {
      query = query.eq('category', category);
    }

    const fetchCount = Math.min(count * 3, 100);
    const { data, error } = await query.limit(fetchCount);

    if (error) {
      throw new Error(`Failed to fetch MIDIs: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    const rows = data as MidiCatalogRow[];

    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = rows[i];
      rows[i] = rows[j] as MidiCatalogRow;
      rows[j] = tmp as MidiCatalogRow;
    }

    if (rows.length >= count) {
      return rows.slice(0, count).map(rowToEntry);
    }

    const padded: MidiCatalogRow[] = [];
    while (padded.length < count) {
      padded.push(rows[padded.length % rows.length] as MidiCatalogRow);
    }
    return padded.map(rowToEntry);
  }

  /**
   * Get a single MIDI by ID. Used by daily service.
   */
  async getMidiById(id: string): Promise<MidiEntry | null> {
    const { data, error } = await this.supabase
      .from('midi_catalog')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch MIDI ${id}: ${error.message}`);
    }

    if (!data) return null;
    return rowToEntry(data as MidiCatalogRow);
  }

  /**
   * Get active MIDIs excluding a set of IDs, filtered by category.
   * Used by daily selection to avoid repeats.
   */
  async getAvailableMidis(
    category: MidiCategory | 'random',
    excludeIds: string[],
  ): Promise<MidiEntry[]> {
    let query = this.supabase.from('midi_catalog').select('*').eq('is_active', true);

    if (category !== 'random') {
      query = query.eq('category', category);
    }

    // Supabase .not('id', 'in', ...) for exclusion
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch available MIDIs: ${error.message}`);
    }

    return (data as MidiCatalogRow[] | null)?.map(rowToEntry) ?? [];
  }
}
