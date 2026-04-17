---
paths:
  - "apps/web/src/lib/midi/**"
  - "apps/web/src/hooks/use-midi-player.ts"
  - "apps/web/src/components/shared/audio-visualizer.tsx"
---

# Audio Engine Rules — What's the Sound?

## Tone.js
- Always start AudioContext with user gesture (Tone.start() on first click)
- Dispose of all Tone objects when component unmounts
- Use Tone.Transport for scheduling — NEVER setTimeout for note timing
- Connect all audio nodes through a master gain for volume control

## MIDI Playback
- Parse MIDI with @tonejs/midi, play with Tone.js Sampler/Synth
- Phase playback: filter tracks and beats per PhaseConfig
- Stop: Tone.Transport.stop() + cancel all scheduled events
- Replay: stop + play same phase again

## Soundfont Caching
- Total cache budget across all soundfonts: max 20 MB (SW cache can be evicted above that)
- Default set (always precached): Piano only (~2 MB)
- Lazy set (fetched on first use): Guitar, Bass, Strings, Drums — fetch when MidiPlayer detects the instrument in a track
- Fallback cascade: exact soundfont → piano → Tone.PolySynth. Log which path was taken.
- Cache key MUST include a version hash (e.g. `sf-piano-<hash8>.sf2`) so releases bust old entries without wiping unrelated caches
- On SW `activate`, delete soundfont cache entries whose hash is not in the current manifest

## Browser Compatibility
- Safari iOS: requires user gesture for first audio play
- Show "Tap to start" button before first playback
- Handle AudioContext state (suspended → running)
- Pause playback on Page Visibility API hidden event

## Visualizer
- Use Tone.Analyser for FFT data
- Render with canvas (not DOM elements) for performance
- requestAnimationFrame with 30fps throttle
- Disable rendering when tab is hidden
- Responsive: fill container width, fixed height

## Anti-cheat
- MIDI files fetched per-phase from server (never all at once)
- No MIDI metadata (title/artist) in client until round_end
- Obfuscate phase audio endpoints to prevent prefetching
