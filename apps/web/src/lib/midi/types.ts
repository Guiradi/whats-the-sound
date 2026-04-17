export interface MidiNote {
  midi: number;
  time: number;
  duration: number;
  velocity: number;
}

export interface MidiTrack {
  index: number;
  name: string;
  instrumentNumber: number;
  instrumentFamily: string;
  instrumentName: string;
  isDrum: boolean;
  notes: MidiNote[];
}

export interface MidiData {
  durationSeconds: number;
  bpm: number;
  ppq: number;
  tracks: MidiTrack[];
}
