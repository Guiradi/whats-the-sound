import { Midi } from '@tonejs/midi';

/**
 * Generates a small multi-track MIDI for dev smoke testing. 8 beats at 120 BPM:
 * - Track 0 "Melody" (Acoustic Grand Piano, GM 0): C major scale
 * - Track 1 "Bass" (Acoustic Bass, GM 32): walking bass line
 */
export function generateTestMelodyBuffer(): ArrayBuffer {
  const midi = new Midi();
  midi.header.setTempo(120);

  const melody = midi.addTrack();
  melody.name = 'Melody';
  melody.instrument.number = 0;
  const melodyNotes: { midi: number; time: number; duration: number }[] = [
    { midi: 60, time: 0, duration: 0.45 },
    { midi: 62, time: 0.5, duration: 0.45 },
    { midi: 64, time: 1, duration: 0.45 },
    { midi: 65, time: 1.5, duration: 0.45 },
    { midi: 67, time: 2, duration: 0.45 },
    { midi: 69, time: 2.5, duration: 0.45 },
    { midi: 71, time: 3, duration: 0.45 },
    { midi: 72, time: 3.5, duration: 0.9 },
    { midi: 71, time: 4.5, duration: 0.45 },
    { midi: 69, time: 5, duration: 0.45 },
    { midi: 67, time: 5.5, duration: 0.45 },
    { midi: 64, time: 6, duration: 0.9 },
    { midi: 60, time: 7, duration: 0.9 },
  ];
  for (const note of melodyNotes) {
    melody.addNote({ midi: note.midi, time: note.time, duration: note.duration, velocity: 0.8 });
  }

  const bass = midi.addTrack();
  bass.name = 'Bass';
  bass.instrument.number = 32;
  const bassNotes: { midi: number; time: number; duration: number }[] = [
    { midi: 36, time: 0, duration: 0.9 },
    { midi: 43, time: 1, duration: 0.9 },
    { midi: 40, time: 2, duration: 0.9 },
    { midi: 43, time: 3, duration: 0.9 },
    { midi: 41, time: 4, duration: 0.9 },
    { midi: 45, time: 5, duration: 0.9 },
    { midi: 43, time: 6, duration: 0.9 },
    { midi: 36, time: 7, duration: 0.9 },
  ];
  for (const note of bassNotes) {
    bass.addNote({ midi: note.midi, time: note.time, duration: note.duration, velocity: 0.7 });
  }

  const bytes = midi.toArray();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
