import { Midi } from '@tonejs/midi';
import type { MidiData } from './types';

export async function parseMidiFromUrl(url: string): Promise<MidiData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch MIDI (${response.status}): ${url}`);
  }
  const buffer = await response.arrayBuffer();
  return parseMidiFromBuffer(buffer);
}

export function parseMidiFromBuffer(buffer: ArrayBuffer): MidiData {
  const midi = new Midi(buffer);
  const bpm = midi.header.tempos[0]?.bpm ?? 120;

  return {
    durationSeconds: midi.duration,
    bpm,
    ppq: midi.header.ppq,
    tracks: midi.tracks.map((track, index) => ({
      index,
      name: track.name || `Track ${index + 1}`,
      instrumentNumber: track.instrument.number,
      instrumentFamily: track.instrument.family,
      instrumentName: track.instrument.name,
      isDrum: track.instrument.percussion === true,
      notes: track.notes.map((note) => ({
        midi: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity,
      })),
    })),
  };
}
