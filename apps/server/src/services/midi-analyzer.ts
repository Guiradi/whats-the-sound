import ToneMidi from '@tonejs/midi';

const { Midi } = ToneMidi;
import type { MidiPhases } from '@wts/shared';

/**
 * Number of distinct note-onset times per phase.
 * Phase 1 reveals the first 4 note events, phase 4 reveals 32.
 * Notes starting at the same time (chords) count as one event.
 */
const PHASE_NOTE_EVENTS = [4, 8, 16, 32] as const;
const MIN_NOTE_EVENTS = 32;

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

/**
 * Analyze a MIDI buffer: trim leading silence, compute note-count-based phases.
 * Returns the (possibly trimmed) buffer and analysis metadata.
 */
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

  // Collect all notes across all tracks
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

  // Sort by time
  allNotes.sort((a, b) => a.time - b.time);

  // Get distinct note-onset times (chords = single event)
  const CHORD_WINDOW_SEC = 0.02; // 20ms — notes within this window count as one event
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

  // Detect leading silence
  const firstNoteTime = allNotes[0]?.time ?? 0;

  // Get tempo
  const bpm = midi.header.tempos[0]?.bpm ?? 120;
  const timeSig = midi.header.timeSignatures[0];
  const beatsPerMeasure = timeSig?.timeSignature[0] ?? 4;
  const secondsPerBeat = 60 / bpm;
  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;

  // Trim: snap to the start of the measure containing the first note
  const firstNoteMeasure = Math.floor(firstNoteTime / secondsPerMeasure);
  const trimSeconds = firstNoteMeasure * secondsPerMeasure;

  const lastNoteEnd = Math.max(...allNotes.map((n) => n.time + n.duration));
  const effectiveDuration = lastNoteEnd - trimSeconds;

  // Trim: shift all notes backward by trimSeconds
  let outputBuffer = buffer;
  if (trimSeconds > 0) {
    const trimmedMidi = new Midi();

    trimmedMidi.header.setTempo(bpm);
    if (timeSig) {
      trimmedMidi.header.timeSignatures = [
        { ticks: 0, timeSignature: timeSig.timeSignature, measures: 0 },
      ];
    }

    for (const srcTrack of midi.tracks) {
      const dstTrack = trimmedMidi.addTrack();
      dstTrack.name = srcTrack.name;
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

    outputBuffer = Buffer.from(trimmedMidi.toArray());

    // Recompute onsets relative to trimmed file
    for (let i = 0; i < distinctOnsets.length; i++) {
      distinctOnsets[i] = (distinctOnsets[i] ?? 0) - trimSeconds;
    }
  }

  // Compute phases based on note-event count.
  // Each phase's endBeat = beat position just after the Nth distinct note onset.
  function noteEventToBeat(noteEventCount: number): number {
    const idx = Math.min(noteEventCount, distinctOnsets.length) - 1;
    const onsetSec = distinctOnsets[idx] ?? 0;
    // Include the note + a small buffer so the note isn't cut off at the boundary
    const endSec = onsetSec + CHORD_WINDOW_SEC + 0.05;
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
