# Void Saber — Build Instructions

> A minimalist, complete Beat Saber clone for Quest browser and desktop Chrome.
> Vertical slice: thin everywhere, complete end-to-end, captures the feel.

---

## Stack

| Tool | Role | Why |
|---|---|---|
| **Three.js** | 3D engine, WebGL, XR loop | The metal for 3D web — no wrapper libraries (no R3F, no Drei) |
| **Three.js `renderer.xr`** | WebXR session management | Thin built-in pass-through, saves 200+ lines of raw XR boilerplate |
| **Raw Web Audio API** | Sound generation | `AudioContext`, `OscillatorNode`, `GainNode` — no Tone.js, no middleware |
| **Vite** | Build tool | Fast TS, HMR, clean config |
| **TypeScript** | Language | Type safety for 3D math, events, state |
| **pnpm** | Package manager | Fast, strict |

### Dependency Rule

> If removing it costs 10x the code → keep it (Three.js).
> If removing it costs 2x the code → skip it (Tone.js, physics libs, UI frameworks).
> Raw browser APIs when reasonable. No library on top of Three.js.

### Color Rule

> **HSL everywhere.** Never hex. All colors defined as `hsl()` in CSS and `new THREE.Color().setHSL()` in JS.

---

## Theme

| Element | Color |
|---|---|
| Left saber / cubes | `hsl(185, 100%, 55%)` — Cyan |
| Right saber / cubes | `hsl(310, 100%, 60%)` — Magenta |
| Environment | Dark void, neon accents |

Theme is a single config object, trivially swappable later.

---

## Project Structure

```
void-saber/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── main.ts              # Entry point, renderer setup, XR session
│   ├── config.ts            # Theme colors, gameplay constants, timing
│   ├── state.ts             # Game state machine (menu → playing → results → menu)
│   │
│   ├── scene/
│   │   ├── corridor.ts      # Dark corridor, neon track, side pillars, fog
│   │   ├── environment.ts   # Beat-reactive ambient system (pulse, glow, rotation)
│   │   └── lighting.ts      # Ambient, point lights, fog setup
│   │
│   ├── gameplay/
│   │   ├── cubes.ts         # Cube spawning, movement, directional arrows, pooling
│   │   ├── sabers.ts        # Saber meshes, glow, point lights
│   │   ├── trails.ts        # Saber swing trail ribbon geometry
│   │   ├── collision.ts     # Saber-cube hit detection, saber-saber intersection
│   │   ├── scoring.ts       # Hit/miss counter, current score
│   │   └── particles.ts     # Cut burst (mini rounded cubes), saber spark particles
│   │
│   ├── audio/
│   │   ├── engine.ts        # Raw Web Audio API: AudioContext, master gain, scheduling
│   │   ├── drums.ts         # Kick, snare, hat synthesis
│   │   ├── synths.ts        # Simple bass, pad oscillators
│   │   └── songs.ts         # Song definitions: BPM, beat patterns, instrument arrangement
│   │
│   ├── beatmap/
│   │   ├── types.ts         # Beatmap format types
│   │   ├── loader.ts        # Parse beatmap data
│   │   └── maps/            # Pre-built beatmap JSON files per song
│   │       ├── song-01.json
│   │       ├── song-02.json
│   │       └── song-03.json
│   │
│   ├── xr/
│   │   ├── controllers.ts   # Read XRInputSource, grip/trigger state
│   │   ├── haptics.ts       # Vibration pulses via gamepad.hapticActuators
│   │   ├── pointer.ts       # Laser pointer raycast for menu interaction
│   │   └── hands.ts         # Controller model (thin pointer in menu, saber in game)
│   │
│   ├── ui/
│   │   ├── menu-scene.ts    # 3D menu environment setup
│   │   ├── panel-center.ts  # Song list, difficulty, play button — FUNCTIONAL
│   │   ├── panel-left.ts    # Settings mock — lightweight static layout
│   │   ├── panel-right.ts   # Leaderboard mock — lightweight static layout
│   │   ├── hud.ts           # In-game score display, combo text
│   │   ├── results.ts       # Post-song: score, retry button, menu button
│   │   └── text.ts          # SDF or canvas-texture text rendering helper
│   │
│   └── utils/
│       ├── geometry.ts      # RoundedBoxGeometry, shared geometries
│       ├── pool.ts          # Object pool for cubes and particles
│       ├── math.ts          # Lerp, clamp, easing helpers
│       └── clock.ts         # Beat clock, audio-synced timing
```

---

## Core Path — The Complete Workflow

Everything below MUST work end-to-end. No dead ends, no missing screens.

```
Launch → Menu → Select Song → Select Difficulty → Play → Score Screen → Retry/Menu → ...
```
