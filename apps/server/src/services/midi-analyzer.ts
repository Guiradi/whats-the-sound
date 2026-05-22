import ToneMidi from '@tonejs/midi';

const { Midi } = ToneMidi;
import type { MidiPhases } from '@wts/shared';

const PHASE_NOTE_EVENTS = [4, 8, 16, 32] as const;
const MIN_NOTE_EVENTS = 32;
const CHORD_WINDOW_SEC = 0.02;
const PHASE_END_BUFFER_SEC = 0.05;

export interface MidiAnalysis {
  totalNotes: number;
  bpm: number;
  durationSeconds: number;
  trimmedSeconds: number;
  phases: MidiPhases;
}

export interface AnalysisError {
  code: 'TOO_SHORT' | 'NO_NOTES' | 'PARSE_ERROR';
  message: string;
}

export type AnalysisResult =
  | { ok: true; analysis: MidiAnalysis; buffer: Buffer }
  | { ok: false; error: AnalysisError };

export function analyzeMidi(buffer: Buffer): AnalysisResult {
  let midi: InstanceType<typeof Midi>;
  try {
    midi = new Midi(buffer);
  } catch {
    return {
      ok: false,
      error: { code: 'PARSE_ERROR', message: 'Invalid MIDI file.' },
    };
  }

  const allNotes: { time: number; duration: number }[] = [];
  for (const track of midi.tracks) {
    for (const note of track.notes) {
      allNotes.push({ time: note.time, duration: note.duration });
    }
  }

  if (allNotes.length === 0) {
    return {
      ok: false,
      error: { code: 'NO_NOTES', message: 'MIDI file has no notes.' },
    };
  }

  allNotes.sort((a, b) => a.time - b.time);

  const distinctOnsets: number[] = [];
  let lastOnset = Number.NEGATIVE_INFINITY;
  for (const note of allNotes) {
    if (note.time - lastOnset > CHORD_WINDOW_SEC) {
      distinctOnsets.push(note.time);
      lastOnset = note.time;
    }
  }

  if (distinctOnsets.length < MIN_NOTE_EVENTS) {
    return {
      ok: false,
      error: {
        code: 'TOO_SHORT',
        message: `MIDI has ${distinctOnsets.length} distinct note events but needs at least ${MIN_NOTE_EVENTS}.`,
      },
    };
  }

  const firstNoteTime = allNotes[0]?.time ?? 0;

  const bpm = midi.header.tempos[0]?.bpm ?? 120;
  const timeSig = midi.header.timeSignatures[0];
  const beatsPerMeasure = timeSig?.timeSignature[0] ?? 4;
  const secondsPerBeat = 60 / bpm;
  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;

  const firstNoteMeasure = Math.floor(firstNoteTime / secondsPerMeasure);
  const trimSeconds = firstNoteMeasure * secondsPerMeasure;

  const lastNoteEnd = Math.max(...allNotes.map((n) => n.time + n.duration));
  const effectiveDuration = lastNoteEnd - trimSeconds;

  // Always rebuild the buffer so source-MIDI metadata (track names, SequenceName,
  // header name) — which routinely contains the song title and artist — never
  // reaches the public storage object. Anti-cheat: track names are visible to any
  // client that parses the file with @tonejs/midi.
  const cleanMidi = new Midi();
  cleanMidi.header.setTempo(bpm);
  if (timeSig) {
    cleanMidi.header.timeSignatures = [
      { ticks: 0, timeSignature: timeSig.timeSignature, measures: 0 },
    ];
  }
  // header.name often carries the song title — clear it.
  cleanMidi.header.name = '';

  for (const srcTrack of midi.tracks) {
    const dstTrack = cleanMidi.addTrack();
    // Do NOT copy srcTrack.name — it can contain "Lead — <Title>" / "Vocals: <Artist>".
    dstTrack.channel = srcTrack.channel;
    dstTrack.instrument.number = srcTrack.instrument.number;

    for (const note of srcTrack.notes) {
      const newTime = note.time - trimSeconds;
      if (newTime < 0) continue;
      dstTrack.addNote({
        midi: note.midi,
        time: newTime,
        duration: note.duration,
        velocity: note.velocity,
      });
    }

    for (const ccNum of Object.keys(srcTrack.controlChanges)) {
      const changes = srcTrack.controlChanges[Number(ccNum)];
      if (!changes) continue;
      for (const change of changes) {
        const newTime = change.time - trimSeconds;
        if (newTime < 0) continue;
        dstTrack.addCC({ number: change.number, value: change.value, time: newTime });
      }
    }
  }

  const outputBuffer = Buffer.from(cleanMidi.toArray());

  if (trimSeconds > 0) {
    for (let i = 0; i < distinctOnsets.length; i++) {
      distinctOnsets[i] = (distinctOnsets[i] ?? 0) - trimSeconds;
    }
  }

  function noteEventToBeat(noteEventCount: number): number {
    const idx = Math.min(noteEventCount, distinctOnsets.length) - 1;
    const onsetSec = distinctOnsets[idx] ?? 0;
    const endSec = onsetSec + CHORD_WINDOW_SEC + PHASE_END_BUFFER_SEC;
    return Math.ceil(endSec / secondsPerBeat);
  }

  const phases: MidiPhases = {
    phase1: { startBeat: 0, endBeat: noteEventToBeat(PHASE_NOTE_EVENTS[0]) },
    phase2: { startBeat: 0, endBeat: noteEventToBeat(PHASE_NOTE_EVENTS[1]) },
    phase3: { startBeat: 0, endBeat: noteEventToBeat(PHASE_NOTE_EVENTS[2]) },
    phase4: { startBeat: 0, endBeat: noteEventToBeat(PHASE_NOTE_EVENTS[3]) },
  };

  return {
    ok: true,
    analysis: {
      totalNotes: distinctOnsets.length,
      bpm: Math.round(bpm),
      durationSeconds: effectiveDuration,
      trimmedSeconds: trimSeconds,
      phases,
    },
    buffer: outputBuffer,
  };
}
