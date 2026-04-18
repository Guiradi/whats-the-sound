import ToneMidi from '@tonejs/midi';

const { Midi } = ToneMidi;
import type { MidiPhases } from '@wts/shared';

/** Fixed phase measure counts for progressive reveal */
const PHASE_MEASURES = [4, 8, 16, 32] as const;
const MIN_MEASURES = 32;

export interface MidiAnalysis {
  totalMeasures: number;
  beatsPerMeasure: number;
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
 * Analyze a MIDI buffer: trim leading silence, count measures, compute phases.
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

  // Detect leading silence: time of the first note
  const firstNoteTime = Math.min(...allNotes.map((n) => n.time));

  // Get tempo and time signature
  const bpm = midi.header.tempos[0]?.bpm ?? 120;
  const timeSig = midi.header.timeSignatures[0];
  const beatsPerMeasure = timeSig?.timeSignature[0] ?? 4;
  const secondsPerBeat = 60 / bpm;
  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;

  // Trim: snap to the start of the measure containing the first note
  const firstNoteMeasure = Math.floor(firstNoteTime / secondsPerMeasure);
  const trimSeconds = firstNoteMeasure * secondsPerMeasure;

  // Compute total duration after trim
  const lastNoteEnd = Math.max(...allNotes.map((n) => n.time + n.duration));
  const effectiveDuration = lastNoteEnd - trimSeconds;
  const totalMeasures = Math.floor(effectiveDuration / secondsPerMeasure);

  if (totalMeasures < MIN_MEASURES) {
    return {
      ok: false,
      error: {
        code: 'TOO_SHORT',
        message: `MIDI has ${totalMeasures} measures but needs at least ${MIN_MEASURES}. (${beatsPerMeasure} beats/measure, ${Math.round(bpm)} BPM)`,
      },
    };
  }

  // Trim: shift all notes backward by trimSeconds
  let outputBuffer = buffer;
  if (trimSeconds > 0) {
    const trimmedMidi = new Midi();

    // Copy header
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

      // Copy control changes
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
  }

  // Compute phases: 4, 8, 16, 32 measures from beat 0
  const phases: MidiPhases = {
    phase1: { startBeat: 0, endBeat: PHASE_MEASURES[0] * beatsPerMeasure },
    phase2: { startBeat: 0, endBeat: PHASE_MEASURES[1] * beatsPerMeasure },
    phase3: { startBeat: 0, endBeat: PHASE_MEASURES[2] * beatsPerMeasure },
    phase4: { startBeat: 0, endBeat: PHASE_MEASURES[3] * beatsPerMeasure },
  };

  return {
    ok: true,
    analysis: {
      totalMeasures,
      beatsPerMeasure,
      bpm: Math.round(bpm),
      durationSeconds: effectiveDuration,
      trimmedSeconds: trimSeconds,
      phases,
    },
    buffer: outputBuffer,
  };
}
