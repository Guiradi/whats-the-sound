import type { MidiCategory, MidiEntry } from '@wts/shared';

/**
 * Interface for loading MIDI entries. Allows swapping implementations
 * (stub for testing, Supabase for production).
 */
export interface MidiProvider {
  getMidis(category: MidiCategory | 'random', count: number): Promise<MidiEntry[]>;
}

/**
 * Stub provider with hardcoded entries for Sprint 3 testing.
 * Will be replaced by a Supabase-backed provider in TASK-018.
 */
export class StubMidiProvider implements MidiProvider {
  private readonly stubs: MidiEntry[] = [
    makeStub('stub-1', 'Bohemian Rhapsody', 'Queen', 'rock'),
    makeStub('stub-2', 'Billie Jean', 'Michael Jackson', 'pop'),
    makeStub('stub-3', 'Garota de Ipanema', 'Tom Jobim', 'mpb'),
    makeStub('stub-4', 'Smells Like Teen Spirit', 'Nirvana', 'rock'),
    makeStub('stub-5', 'Imagine', 'John Lennon', 'pop'),
    makeStub('stub-6', 'Yesterday', 'The Beatles', 'pop'),
    makeStub('stub-7', 'Evidências', 'Chitãozinho e Xororó', 'sertanejo'),
    makeStub('stub-8', 'Take On Me', 'a-ha', 'pop'),
    makeStub('stub-9', 'Sweet Child O Mine', 'Guns N Roses', 'rock'),
    makeStub('stub-10', 'Hotel California', 'Eagles', 'rock'),
    makeStub('stub-11', 'Despacito', 'Luis Fonsi', 'pop'),
    makeStub('stub-12', 'Shape of You', 'Ed Sheeran', 'pop'),
    makeStub('stub-13', 'Aquarela', 'Toquinho', 'mpb'),
    makeStub('stub-14', 'Zelda Theme', 'Koji Kondo', 'games'),
    makeStub('stub-15', 'Mario Theme', 'Koji Kondo', 'games'),
  ];

  async getMidis(category: MidiCategory | 'random', count: number): Promise<MidiEntry[]> {
    const pool =
      category === 'random' ? [...this.stubs] : this.stubs.filter((m) => m.category === category);

    // Shuffle using Fisher-Yates
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }

    return pool.slice(0, count);
  }
}

function makeStub(id: string, title: string, artist: string, category: MidiCategory): MidiEntry {
  return {
    id,
    title,
    artist,
    category,
    difficulty: 'medium',
    midiFileUrl: `https://storage.example.com/${id}.mid`,
    acceptedTitles: [title, title.toLowerCase()],
    acceptedArtists: [artist, artist.toLowerCase()],
    phases: {
      phase1: { tracks: [0], startBeat: 0, endBeat: 16, description: 'Melody only' },
      phase2: { tracks: [0, 1], startBeat: 0, endBeat: 32, description: 'Melody + bass' },
      phase3: { tracks: [0, 1, 2], startBeat: 0, endBeat: 48, description: 'Most tracks' },
      phase4: { tracks: [0, 1, 2, 3], startBeat: 0, endBeat: 64, description: 'Full arrangement' },
    },
    isActive: true,
    playCount: 0,
    correctRate: 0,
  };
}
