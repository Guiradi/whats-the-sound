import type { MidiCategory, MidiEntry } from '@wts/shared';

/**
 * Interface for loading MIDI entries from the catalog.
 */
export interface MidiProvider {
  getMidis(category: MidiCategory | 'random', count: number): Promise<MidiEntry[]>;
}
