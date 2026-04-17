import * as Tone from 'tone';

interface TrackIdentity {
  instrumentNumber: number;
  instrumentFamily: string;
  isDrum: boolean;
}

export interface InstrumentRegistry {
  get(track: TrackIdentity): Tone.PolySynth;
  dispose(): void;
}

/**
 * Minimal instrument registry. MVP uses a single PolySynth per "slot" (melodic
 * vs drum) as the documented fallback path from specs/features/02-midi-engine.md.
 * Real soundfont samplers will land behind the same interface when TASK-018
 * seeds the catalog with actual audio.
 */
export function createInstrumentRegistry(output: Tone.ToneAudioNode): InstrumentRegistry {
  const cache = new Map<string, Tone.PolySynth>();

  function keyFor(track: TrackIdentity): string {
    return track.isDrum ? 'drum' : 'melodic';
  }

  return {
    get(track) {
      const key = keyFor(track);
      const cached = cache.get(key);
      if (cached) return cached;
      const synth = new Tone.PolySynth(Tone.Synth);
      synth.connect(output);
      cache.set(key, synth);
      return synth;
    },
    dispose() {
      for (const inst of cache.values()) {
        inst.disconnect();
        inst.dispose();
      }
      cache.clear();
    },
  };
}
