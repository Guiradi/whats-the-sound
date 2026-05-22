import type { PhaseConfig } from '@wts/shared';
import ToneMidi from '@tonejs/midi';

const { Midi } = ToneMidi;

/**
 * Produce a minimal MIDI buffer containing only the notes inside the [startBeat, endBeat)
 * window of the source MIDI. Track names, header name and other identifying metadata are
 * stripped so even after fetching the clip a player cannot recover the song title.
 *
 * Notes that straddle the boundary are clipped:
 *   - Notes ending before startBeat are dropped.
 *   - Notes starting after endBeat are dropped.
 *   - Notes spanning startBeat are kept with a clipped duration.
 *   - Times are shifted so the resulting clip starts at t=0.
 *
 * Tempo and time signature are copied from the source so the client can render
 * the clip at the original BPM.
 */
export function clipMidiToPhase(sourceBuffer: Buffer, phase: PhaseConfig): Buffer {
  const source = new Midi(sourceBuffer);

  const bpm = source.header.tempos[0]?.bpm ?? 120;
  const timeSig = source.header.timeSignatures[0];
  const secondsPerBeat = 60 / bpm;

  const startSec = phase.startBeat * secondsPerBeat;
  const endSec = phase.endBeat * secondsPerBeat;

  const out = new Midi();
  out.header.setTempo(bpm);
  if (timeSig) {
    out.header.timeSignatures = [
      { ticks: 0, timeSignature: timeSig.timeSignature, measures: 0 },
    ];
  }
  out.header.name = '';

  for (const srcTrack of source.tracks) {
    const dstTrack = out.addTrack();
    // Do NOT copy srcTrack.name — leaks the song title.
    dstTrack.channel = srcTrack.channel;
    dstTrack.instrument.number = srcTrack.instrument.number;

    for (const note of srcTrack.notes) {
      const noteEnd = note.time + note.duration;
      if (noteEnd <= startSec) continue;
      if (note.time >= endSec) continue;

      const clippedStart = Math.max(note.time, startSec);
      const clippedEnd = Math.min(noteEnd, endSec);
      const shiftedTime = clippedStart - startSec;
      const clippedDuration = clippedEnd - clippedStart;

      if (clippedDuration <= 0) continue;

      dstTrack.addNote({
        midi: note.midi,
        time: shiftedTime,
        duration: clippedDuration,
        velocity: note.velocity,
      });
    }

    for (const ccNum of Object.keys(srcTrack.controlChanges)) {
      const changes = srcTrack.controlChanges[Number(ccNum)];
      if (!changes) continue;
      for (const change of changes) {
        if (change.time < startSec || change.time >= endSec) continue;
        dstTrack.addCC({
          number: change.number,
          value: change.value,
          time: change.time - startSec,
        });
      }
    }
  }

  return Buffer.from(out.toArray());
}
