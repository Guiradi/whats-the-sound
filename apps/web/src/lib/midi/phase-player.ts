import type { PhaseConfig } from '@wts/shared';
import * as Tone from 'tone';
import { type InstrumentRegistry, createInstrumentRegistry } from './soundfont-loader';
import type { MidiData, MidiNote, MidiTrack } from './types';

export interface PhasePlaybackSnapshot {
  isPlaying: boolean;
  progress: number;
}

interface ScheduledPhase {
  eventIds: number[];
  endAtSeconds: number;
  notes: number;
}

export class PhasePlayer {
  private readonly output: Tone.Gain;
  private readonly analyser: Tone.Analyser;
  private readonly instruments: InstrumentRegistry;
  private scheduled: ScheduledPhase | null = null;
  private endTimeoutId: number | null = null;
  private endedListeners = new Set<() => void>();

  constructor(masterVolumeDb = -6) {
    this.output = new Tone.Gain(Tone.dbToGain(masterVolumeDb));
    this.output.toDestination();
    this.analyser = new Tone.Analyser('fft', 128);
    this.output.connect(this.analyser);
    this.instruments = createInstrumentRegistry(this.output);
  }

  getAnalyser(): Tone.Analyser {
    return this.analyser;
  }

  isPlaying(): boolean {
    return Tone.getTransport().state === 'started';
  }

  getProgress(): number {
    if (!this.scheduled) return 0;
    const elapsed = Tone.getTransport().seconds;
    if (this.scheduled.endAtSeconds <= 0) return 0;
    return Math.min(1, Math.max(0, elapsed / this.scheduled.endAtSeconds));
  }

  onEnded(listener: () => void): () => void {
    this.endedListeners.add(listener);
    return () => this.endedListeners.delete(listener);
  }

  play(midi: MidiData, phase: PhaseConfig): PhasePlaybackSnapshot {
    this.stop();

    const transport = Tone.getTransport();
    transport.bpm.value = midi.bpm;
    transport.loop = false;

    const secondsPerBeat = 60 / midi.bpm;
    const phaseStartSec = phase.startBeat * secondsPerBeat;
    const phaseEndSec = phase.endBeat * secondsPerBeat;
    return this.playWindow(midi, phaseStartSec, phaseEndSec, {
      phaseLabel: `[${phase.startBeat},${phase.endBeat}]`,
    });
  }

  playFull(midi: MidiData): PhasePlaybackSnapshot {
    this.stop();

    const transport = Tone.getTransport();
    transport.bpm.value = midi.bpm;
    transport.loop = false;

    let lastEndSec = 0;
    for (const track of midi.tracks) {
      for (const note of track.notes) {
        const noteEnd = note.time + note.duration;
        if (noteEnd > lastEndSec) lastEndSec = noteEnd;
      }
    }
    return this.playWindow(midi, 0, Math.max(lastEndSec, 0.1), {
      phaseLabel: 'full',
    });
  }

  private playWindow(
    midi: MidiData,
    phaseStartSec: number,
    phaseEndSec: number,
    meta: { phaseLabel: string },
  ): PhasePlaybackSnapshot {
    const transport = Tone.getTransport();

    // Count total notes for debug
    let totalNotes = 0;
    for (const track of midi.tracks) {
      totalNotes += track.notes.length;
    }

    const eventIds: number[] = [];
    let latestEnd = 0;
    let noteCount = 0;

    for (const track of midi.tracks) {
      noteCount += this.scheduleTrack(track, phaseStartSec, phaseEndSec, eventIds);
      for (const note of track.notes) {
        if (note.time < phaseStartSec || note.time >= phaseEndSec) continue;
        const relEnd = note.time - phaseStartSec + Math.min(note.duration, phaseEndSec - note.time);
        if (relEnd > latestEnd) latestEnd = relEnd;
      }
    }

    // If phase yielded zero notes, still resolve with an immediate end event.
    const endAt = Math.max(latestEnd, 0.1);
    this.scheduled = { eventIds, endAtSeconds: endAt, notes: noteCount };

    console.debug(
      `[PhasePlayer] bpm=${midi.bpm} phase=${meta.phaseLabel} ` +
        `window=[${phaseStartSec.toFixed(2)}s,${phaseEndSec.toFixed(2)}s] ` +
        `notes=${noteCount}/${totalNotes} endAt=${endAt.toFixed(2)}s`,
    );

    transport.position = 0;
    transport.start();

    // Schedule an end trigger slightly after the last note's release tail.
    this.endTimeoutId = window.setTimeout(
      () => {
        this.handleEnded();
      },
      (endAt + 0.4) * 1000,
    );

    return { isPlaying: true, progress: 0 };
  }

  private scheduleTrack(
    track: MidiTrack,
    phaseStartSec: number,
    phaseEndSec: number,
    eventIds: number[],
  ): number {
    const instrument = this.instruments.get(track);
    const transport = Tone.getTransport();
    let count = 0;

    for (const note of track.notes) {
      if (!isNoteWithinPhase(note, phaseStartSec, phaseEndSec)) continue;
      const relTime = note.time - phaseStartSec;
      const duration = Math.min(note.duration, phaseEndSec - note.time);
      const freq = Tone.Frequency(note.midi, 'midi').toNote();
      const id = transport.schedule((time) => {
        instrument.triggerAttackRelease(freq, duration, time, note.velocity);
      }, relTime);
      eventIds.push(id);
      count += 1;
    }
    return count;
  }

  stop(): void {
    const transport = Tone.getTransport();
    if (this.scheduled) {
      for (const id of this.scheduled.eventIds) transport.clear(id);
      this.scheduled = null;
    }
    transport.stop();
    transport.cancel(0);
    transport.position = 0;
    if (this.endTimeoutId !== null) {
      window.clearTimeout(this.endTimeoutId);
      this.endTimeoutId = null;
    }
  }

  private handleEnded(): void {
    this.endTimeoutId = null;
    Tone.getTransport().stop();
    for (const listener of this.endedListeners) listener();
  }

  dispose(): void {
    this.stop();
    this.endedListeners.clear();
    this.instruments.dispose();
    this.analyser.disconnect();
    this.analyser.dispose();
    this.output.disconnect();
    this.output.dispose();
  }
}

function isNoteWithinPhase(note: MidiNote, startSec: number, endSec: number): boolean {
  return note.time >= startSec && note.time < endSec;
}
