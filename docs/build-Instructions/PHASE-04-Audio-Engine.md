Phase 4: Audio Engine (Raw Web Audio API)

Goal: generate simple but musical beats from code. No audio files.

## Architecture

```typescript
// engine.ts
const ctx = new AudioContext();
const masterGain = ctx.createGain();
masterGain.connect(ctx.destination);

// Schedule all events ahead of time using ctx.currentTime
// Each song is a sequence of timed audio events
```

## Drum Synthesis

All drums are synthesized — no samples.

- **Kick:** `OscillatorNode` (sine, 150Hz → 40Hz pitch sweep over ~0.1s) + `GainNode` (fast decay)
- **Snare:** White noise (`AudioBuffer` filled with `Math.random()`) through `BiquadFilterNode` (highpass ~1000Hz) + short sine pop
- **Hi-hat:** White noise through `BiquadFilterNode` (highpass ~7000Hz), very short envelope (~30ms)

## Synth

- **Bass:** `OscillatorNode` (sawtooth or square), `BiquadFilterNode` (lowpass), `GainNode`
- **Pad (optional for core):** Two detuned `OscillatorNode` (sawtooth), `BiquadFilterNode` (lowpass)

## Song Definition

```typescript
interface Song {
  id: string;
  name: string;
  bpm: number;
  duration: number;         // seconds
  timeSignature: [number, number]; // e.g. [4, 4]
  tracks: {
    kick: number[];         // 1/0 per 8th note step
    snare: number[];
    hat: number[];
    bass: BassEvent[];      // { step, note, duration }
  };
}
```

Each song is ~30-60 seconds. 3-5 songs with different tempos and feels:
- Slow chill (100 BPM)
- Mid-tempo groove (120 BPM)
- Fast energy (140 BPM)
- Varying patterns to keep it interesting

## Beat Clock

The beat clock is THE critical sync mechanism:

```typescript
// clock.ts
// Derives exact beat timing from AudioContext.currentTime
// All game systems (cube spawning, environment pulse) read from this
// Never use Date.now() or performance.now() for music sync
```

- Song starts at a known `audioStartTime`
- Current beat = `(ctx.currentTime - audioStartTime) / (60 / bpm)`
- All cube spawn/arrival times are pre-computed from beatmap + audio timing
- Environment pulse reads current beat fraction for smooth animation
