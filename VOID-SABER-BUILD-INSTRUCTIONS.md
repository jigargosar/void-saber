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

### Phase 1: Project Scaffold

1. `pnpm create vite void-saber --template vanilla-ts`
2. `pnpm add three` and `pnpm add -D @types/three`
3. Set up `vite.config.ts` with HTTPS (required for WebXR):
   - Use `@vitejs/plugin-basic-ssl` or manual cert
4. Basic `index.html` — minimal, just a canvas and "Enter VR" button
5. `main.ts`:
   - Create `WebGLRenderer` with `antialias: true, alpha: false`
   - `renderer.xr.enabled = true`
   - Add `VRButton` from three/examples (or minimal custom version)
   - Create `Scene`, `PerspectiveCamera`
   - `renderer.setAnimationLoop(frame)` for the XR-compatible render loop
   - Handle both XR and flat-screen (no extra code — same loop, camera auto-switches)

### Phase 2: State Machine

Simple finite state machine driving the entire app:

```
type GameState = 'menu' | 'countdown' | 'playing' | 'paused' | 'results';
```

- `menu` — Show menu panels, laser pointer controllers
- `countdown` — 3-2-1 before song starts (brief, builds anticipation)
- `playing` — Game loop, sabers, cubes, scoring
- `paused` — Freeze game, show resume/quit (trigger via controller button)
- `results` — Show score, retry and menu buttons

State transitions tear down the old scene and build the new one. All cleanup is explicit — dispose geometries, stop audio, clear pools.

### Phase 3: Menu Environment

**The vibe:** Player puts on headset and it feels like a real game lobby. Simple but polished. Correct colors, correct glow.

#### Center Panel (FUNCTIONAL — this is the critical path)

3D panel floating at eye level, ~2m in front of player.

- **Song list:** Vertical list of 3-5 songs (the AI-generated tracks)
  - Each row: song name, BPM, duration
  - Highlight on laser hover (glow border, slight scale)
  - Select on trigger press
- **Difficulty selector:** Easy / Normal / Hard buttons below song info
  - Highlight on hover, select on trigger
  - Changes which beatmap variant loads
- **Play button:** Large, prominent, glowing
  - Hover highlights it
  - Trigger press → transition to `countdown` state

Implementation: Canvas textures on `PlaneGeometry` meshes. Render text and UI via 2D canvas, apply as `CanvasTexture`, update on state change. No HTML overlay — everything is in 3D.

#### Left Panel (MOCK — lightweight)

Settings layout. Static content rendered once to a canvas texture:
- Volume slider (visual only)
- Player height (visual only)
- Color toggles (visual only)
- Left-handed mode toggle (visual only)

Responds to laser pointer hover (highlight effect) but does nothing functional.

#### Right Panel (MOCK — lightweight)

Leaderboard/scores. Static content:
- 5-8 fake player entries with names and scores
- Current player highlighted

Responds to hover, no function.

#### Menu Controllers

- Thin laser-pointer beam from each controller
- Raycast against UI panels each frame
- Visual feedback: beam dot where it hits, panel element highlights
- Trigger button = click/select
- **NOT the game sabers** — swap models when entering gameplay

### Phase 4: Audio Engine (Raw Web Audio API)

Goal: generate simple but musical beats from code. No audio files.

#### Architecture

```typescript
// engine.ts
const ctx = new AudioContext();
const masterGain = ctx.createGain();
masterGain.connect(ctx.destination);

// Schedule all events ahead of time using ctx.currentTime
// Each song is a sequence of timed audio events
```

#### Drum Synthesis

All drums are synthesized — no samples.

- **Kick:** `OscillatorNode` (sine, 150Hz → 40Hz pitch sweep over ~0.1s) + `GainNode` (fast decay)
- **Snare:** White noise (`AudioBuffer` filled with `Math.random()`) through `BiquadFilterNode` (highpass ~1000Hz) + short sine pop
- **Hi-hat:** White noise through `BiquadFilterNode` (highpass ~7000Hz), very short envelope (~30ms)

#### Synth

- **Bass:** `OscillatorNode` (sawtooth or square), `BiquadFilterNode` (lowpass), `GainNode`
- **Pad (optional for core):** Two detuned `OscillatorNode` (sawtooth), `BiquadFilterNode` (lowpass)

#### Song Definition

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

#### Beat Clock

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

### Phase 5: Beatmap Format

Simple, custom, minimal.

```typescript
interface BeatmapNote {
  time: number;       // seconds from song start (when cube arrives at player)
  lane: number;       // 0-3 (left to right column)
  row: number;        // 0-2 (bottom, middle, top)
  color: 'left' | 'right';  // which saber should hit it
  direction: Direction;      // up, down, left, right, up-left, up-right, down-left, down-right
}

type Direction = 'up' | 'down' | 'left' | 'right' | 'upLeft' | 'upRight' | 'downLeft' | 'downRight';

interface Beatmap {
  songId: string;
  difficulty: 'easy' | 'normal' | 'hard';
  notes: BeatmapNote[];
}
```

- **4 columns (lanes)** × **3 rows** = 12 possible positions (standard Beat Saber grid)
- Each note knows its arrival time, position, color, and required swing direction
- Easy maps: few notes, mostly down/up cuts, wide spacing
- Hard maps: more notes, complex directions, tighter timing
- Maps are hand-authored JSON files — simple arrays of note objects

#### Spawn Mechanics

- Cubes spawn at a far Z distance (~40-60 units away)
- Travel toward player at constant speed
- Speed is calculated so that cube arrives at the player exactly at `note.time`
- `spawnTime = note.time - (spawnDistance / cubeSpeed)`
- Pre-compute all spawn times at song load

### Phase 6: Corridor Environment

**The vibe:** Dark void with neon elements. Not a detailed room — a feeling of infinite space with structure.

#### Track / Runway

- Long `PlaneGeometry` (or thin box) extending from player into the far distance
- Dark material with emissive neon edge lines (cyan/magenta or white)
- Subtle grid lines on the surface, scrolling toward the player (treadmill effect)
- Grid scroll speed synced to BPM

#### Side Pillars

- Simple `BoxGeometry` or `CylinderGeometry` pillars flanking the track
- Emissive material matching theme colors
- Spaced evenly, receding into the distance (8-12 per side)
- Slight glow via emissive + nearby point lights

#### Fog

- `scene.fog = new THREE.FogExp2(color, density)`
- Very dark base color with slight hue tint
- Makes distant pillars and track fade naturally
- Hides the "end of the world"

#### Overhead

- Keep it simple — dark void is fine
- Optional: very distant, dim, large ring geometries for depth perception

### Phase 7: Beat-Reactive Environment

> On every beat, the world breathes.

One unified system, not per-song choreography:

```typescript
// environment.ts
// Reads beat clock → drives visual parameters

function updateEnvironment(beatFraction: number, energy: number) {
  // beatFraction: 0.0 to 1.0 within each beat (0 = on the beat)
  // energy: 0.0 to 1.0 from song section

  const pulse = Math.exp(-beatFraction * 6); // sharp attack, smooth decay

  // Pillar emission intensity: brighter on beat
  pillars.forEach(p => {
    p.material.emissiveIntensity = 0.3 + pulse * 0.7 * energy;
  });

  // Fog density shift: slightly thinner on beat
  scene.fog.density = baseDensity - pulse * 0.005;

  // Track edge glow: pulse brightness
  trackEdges.material.emissiveIntensity = 0.5 + pulse * 0.5;

  // Background ring rotation: continuous, speed varies with energy
  rings.forEach(r => r.rotation.z += 0.001 * energy);

  // Optional: subtle color temperature shift between left/right theme colors
}
```

- Same behavior every song — generic, driven by beat clock
- `energy` value can be constant for core (all songs energy=1.0), or per-section if songs define sections
- The `pulse = exp(-t * k)` pattern is the key — sharp on beat, smooth falloff, feels musical
- Very little code, massive visual impact

### Phase 8: Sabers

#### Mesh Structure (per saber)

```
Group
├── Handle: CylinderGeometry (dark material, MeshLambertMaterial)
├── Blade: CylinderGeometry (thin, MeshBasicMaterial with theme color)
├── Glow: CylinderGeometry (wider, transparent, MeshBasicMaterial, opacity ~0.15)
├── TipGlow: Small SphereGeometry at blade tip (emissive)
└── PointLight (theme color, low intensity, short range — casts on nearby surfaces)
```

- `MeshBasicMaterial` for blade/glow — unaffected by scene lighting, always bright
- Handle uses `MeshLambertMaterial` — responds to light, looks solid

#### Swing Trail (CRITICAL for feel)

Ribbon mesh that records blade tip position each frame:

```typescript
// trails.ts

// Ring buffer of tip positions (last ~15 frames)
const TRAIL_LENGTH = 15;
const positions: THREE.Vector3[] = [];

function updateTrail(bladeTipWorld: THREE.Vector3) {
  positions.unshift(bladeTipWorld.clone());
  if (positions.length > TRAIL_LENGTH) positions.pop();

  // Build ribbon geometry from consecutive positions
  // Two vertices per sample: blade tip + offset along blade direction
  // UV.x = position along trail (for alpha fade)
  // Material: transparent, additive blending, theme color, fades to 0 at tail
}
```

- Use `BufferGeometry` with dynamically updated position attribute
- Material: `MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })`
- Alpha fades from ~0.6 at head to 0.0 at tail
- Fast swings = wide ribbon = looks powerful
- Slow/still = very short trail = clean

#### XR Controller Binding

```typescript
// In XR frame loop:
const session = renderer.xr.getSession();
// controller0 and controller1 from renderer.xr.getController(0/1)
// Read grip space for saber position/rotation
// Saber group.position and .quaternion set from controller grip pose each frame
```

- In menu state: attach pointer mesh to controllers
- In playing state: swap to saber mesh
- Controller index to left/right hand mapping via XRInputSource.handedness

### Phase 9: Cubes

#### Geometry

- `RoundedBoxGeometry` — rounded cube, softer look, not sharp
- Source: Three.js addons (`three/examples/jsm/geometries/RoundedBoxGeometry`)
- Or generate manually: `BoxGeometry` + bevel via custom BufferGeometry
- Same geometry reused for all cubes (instanced or pooled)
- Size: ~0.4 × 0.4 × 0.4 units

#### Arrow Indicator

- Direction arrow on the cube face
- Options:
  a. Canvas texture with arrow drawn per direction (8 textures, swap UV)
  b. Small arrow mesh (triangle + line) attached to cube face
  c. Single arrow texture, rotate the cube or UV to match direction
- Option (a) is simplest — pre-render 8 arrow canvases at startup

#### Visual

- `MeshStandardMaterial` with emissive set to theme color
- Slight emissive intensity so they glow in the dark
- Different color for left vs right (cyan vs magenta)
- Can add a small `PointLight` per cube for local glow (watch performance — maybe just nearest 4-6)

#### Movement

- Pool of cube objects (pre-allocate ~30)
- On spawn: activate from pool, set position to far Z, set lane/row, set arrival time
- Each frame: `cube.position.z = spawnZ + (cubeSpeed * elapsed)`
- When cube reaches player Z position (at `note.time`): it's hittable
- Small time window (~200ms) for successful hit
- If missed (passes player without hit): deactivate, miss event, pool return

#### Lane/Row Positions

```
Rows (Y):    top=1.6   mid=1.2   bottom=0.8   (adjust for VR standing height)
Lanes (X):   -0.6  -0.2  0.2  0.6             (4 columns, ~0.4 apart)
```

### Phase 10: Collision Detection

#### Saber ↔ Cube

- Each frame: test saber blade line segment against cube bounding box
- Blade is a line from handle end to tip in world space
- Use simple AABB or OBB intersection
- On hit:
  - Check direction: compare saber swing velocity direction to cube's required direction
  - Velocity = current tip position - previous frame tip position
  - Angle between velocity vector and required direction must be within ~60° tolerance
  - If direction correct → successful cut
  - If direction wrong → miss (cube passes through, maybe flash red briefly)

#### Saber ↔ Saber

- Each frame: test if the two blade line segments are within proximity (~0.05 units)
- Use closest-point-between-two-line-segments algorithm
- If close enough:
  - Spawn spark particles at midpoint
  - Fire haptic pulse on both controllers
  - Brief white flash at intersection point

### Phase 11: Particles

All particles use `RoundedBoxGeometry` (tiny, ~0.03 units) for visual consistency.

#### Cube Cut Burst

On successful hit:
1. Deactivate the cube
2. Spawn 8-12 tiny rounded cubes at the cube's position
3. Each particle gets:
   - Random velocity: outward from cut center + slight randomization
   - Velocity component in saber swing direction (feels like the cut scattered them)
   - Gravity: subtract from Y velocity each frame (`vy -= 9.8 * dt`)
   - Color: same as the cube that was cut (cyan or magenta)
   - Opacity: fade from 1.0 to 0.0 over ~0.8 seconds
4. Deactivate particle when opacity reaches 0 or Y < -2 (fell out of view)

Pool: pre-allocate ~100 particle objects, reuse.

#### Saber Spark

On saber-saber contact:
1. Spawn 5-8 tiny white/yellow particles at intersection point
2. Short lifespan (~0.3 seconds)
3. Fast outward velocity, gravity, rapid fade
4. `AdditiveBlending` material — looks like sparks

### Phase 12: Haptics

```typescript
// haptics.ts
function pulse(controller: THREE.XRTargetRaySpace, intensity: number, duration: number) {
  const session = renderer.xr.getSession();
  if (!session) return;
  const source = controller.userData.inputSource as XRInputSource;
  const gamepad = source?.gamepad;
  const haptic = gamepad?.hapticActuators?.[0];
  if (haptic) {
    haptic.pulse(intensity, duration);
  }
}

// Usage:
pulse(rightController, 0.6, 80);   // Cube hit: medium pulse, 80ms
pulse(leftController, 0.3, 40);    // Saber contact: light pulse, 40ms
```

- Cube hit: `intensity 0.6, duration 80ms`
- Saber-saber contact: `intensity 0.3, duration 40ms`
- Miss: no haptic (absence of feedback IS the feedback)
- Menu click: `intensity 0.15, duration 30ms` (subtle confirmation)

### Phase 13: Scoring

Core scoring is simple hit/miss:

```typescript
interface GameScore {
  hits: number;
  misses: number;
  totalNotes: number;
  streak: number;        // current consecutive hits
  maxStreak: number;     // best streak this song
}
```

- Hit → `hits++`, `streak++`, update `maxStreak`
- Miss → `misses++`, `streak = 0`
- Percentage = `hits / totalNotes * 100`

#### In-Game HUD

- Floating score text above and behind the play area (not blocking view)
- Current hits / total in small text
- Streak counter if > 5 (subtle, doesn't distract)
- Use canvas texture on a `PlaneGeometry` — update canvas on score change

### Phase 14: Results Screen

Song ends → brief pause (1-2 seconds, music fades, last particles settle) → results appear.

3D panel in front of player (similar to menu panels):

```
╔══════════════════════════════╗
║        SONG COMPLETE         ║
║                              ║
║     ★ ★ ★ ☆ ☆              ║
║                              ║
║   Hits:     142 / 160        ║
║   Accuracy: 88%              ║
║   Max Streak: 47             ║
║                              ║
║   [ RETRY ]    [ MENU ]      ║
╚══════════════════════════════╝
```

- Star rating: simple thresholds (≥90% = 5 stars, ≥80% = 4, etc.)
- **Retry** → reload same song/difficulty, back to `countdown`
- **Menu** → tear down, back to `menu` state
- Both buttons respond to laser pointer hover + trigger
- Panel material: dark with subtle glow border matching theme

### Phase 15: Countdown

Transition between menu → gameplay:

1. Menu panels fade/slide away
2. Corridor environment fades in
3. Controllers swap from pointers to sabers
4. Large "3" appears in front of player (1 second)
5. "2" (1 second)
6. "1" (1 second)
7. Audio starts, cubes begin spawning
8. State → `playing`

Numbers: canvas-textured planes, scale up + fade, theme colored.

---

## Geometry Notes

### RoundedBoxGeometry

Used for: game cubes, particles, UI button shapes.

Source options (in order of preference):
1. `three/examples/jsm/geometries/RoundedBoxGeometry.js` — ships with Three.js
2. Manual: start with `BoxGeometry`, iterate vertices, normalize corners with radius
3. Import from `three-stdlib` if (1) isn't available

Parameters: `new RoundedBoxGeometry(width, height, depth, segments, radius)`
- Game cubes: `(0.4, 0.4, 0.4, 2, 0.06)`
- Particles: `(0.03, 0.03, 0.03, 1, 0.008)`

### Shared Geometry Instances

Create once, reuse everywhere:
```typescript
// geometry.ts
export const CUBE_GEO = new RoundedBoxGeometry(0.4, 0.4, 0.4, 2, 0.06);
export const PARTICLE_GEO = new RoundedBoxGeometry(0.03, 0.03, 0.03, 1, 0.008);
```

All cubes share the same geometry — only materials and transforms differ. Same for particles.

---

## Performance Budget

Target: 72fps on Quest browser (native refresh rate).

- **Draw calls:** <100 per frame
  - Use instanced rendering for cubes if >20 visible
  - Particles: consider `InstancedMesh` for the particle pool
- **Geometries:** Minimal polygon count
  - Cubes: low-poly rounded box (segments=2)
  - Pillars: `CylinderGeometry(r, r, h, 6)` — 6 sides is enough
  - Sabers: `CylinderGeometry(r, r, h, 8)`
- **Lights:** Limit dynamic lights to ~6
  - 1 ambient
  - 2 saber point lights
  - 2-3 pillar/environment lights
  - Cube lights: only nearest few, or skip if perf-tight
- **Textures:** Canvas textures for UI, no image files
- **Shadows:** OFF — too expensive for Quest, not needed with emissive aesthetic
- **Post-processing:** Skip for core (no bloom pass). Nice-to-have.

---

## Audio-Visual Sync — The Critical Detail

The entire game feel depends on cubes arriving EXACTLY on beat. The sync chain:

```
AudioContext.currentTime (master clock)
       ↓
  Beat Clock (derives current beat number + fraction)
       ↓
  ┌────┴────┐
  │         │
Cube      Environment
Spawner   Pulse System
```

- Audio scheduling and cube spawn times are both computed from the same `AudioContext.currentTime`
- NEVER use `setTimeout`, `setInterval`, `Date.now()`, or `requestAnimationFrame` timing for music sync
- The render loop reads `AudioContext.currentTime` each frame to know "where are we in the song"
- Cube positions are computed from this: `expected Z = f(currentAudioTime, note.time, speed)`
- Environment pulse reads `beatFraction = (currentBeat % 1)` from same clock

If audio and visuals use different clocks, cubes will drift. This is the #1 thing to get right.

---

## Implementation Order

Build in this exact order. Each step is testable before moving to the next.

### Sprint 1: Foundation
1. Project scaffold, Vite + TS + Three.js, HTTPS dev server
2. Basic scene: renderer, camera, dark background, simple lighting
3. XR session: "Enter VR" button, XR render loop working on Quest
4. Controller tracking: see raw controller positions in console/scene (debug cubes at hand positions)

### Sprint 2: Corridor
5. Track/runway geometry with neon edges
6. Side pillars
7. Fog
8. Grid scroll animation (even without audio — just constant speed)

### Sprint 3: Sabers
9. Saber mesh (blade + glow + handle + tip light)
10. Attach sabers to XR controllers
11. Swing trail ribbon
12. Saber-saber intersection detection + spark particles
13. Haptic feedback on saber contact

### Sprint 4: Audio
14. Raw Web Audio engine: AudioContext, master gain
15. Drum synthesis: kick, snare, hat
16. Simple bass synth
17. First song definition: beat pattern arrays
18. Beat clock: derive current beat from AudioContext.currentTime
19. Play a song, verify timing is tight

### Sprint 5: Cubes + Beatmap
20. Beatmap format types
21. First beatmap (easy, for song-01)
22. Cube pool + spawn system
23. Cube movement toward player, synced to beat clock
24. Directional arrow textures on cubes
25. RoundedBoxGeometry for cubes

### Sprint 6: Gameplay Core
26. Saber-cube collision detection
27. Direction validation (swing angle check)
28. Cut particle burst (rounded mini-cubes with gravity)
29. Haptic on hit
30. Scoring: hit/miss counter
31. In-game HUD (score display)
32. Miss detection (cube passes player without being hit)

### Sprint 7: Environment Polish
33. Beat-reactive pillar pulse
34. Track edge glow pulse
35. Fog density breathing
36. Background ring rotation (if added)

### Sprint 8: Menu
37. State machine (menu ↔ playing ↔ results)
38. Center panel: song list, selection, difficulty, play button
39. Laser pointer controller in menu (raycast + hover highlight)
40. Trigger press to select/click
41. Controller model swap (pointer → saber on play)

### Sprint 9: Results + Flow
42. Results screen: score display, retry/menu buttons
43. Retry flow: reload song, countdown, play
44. Menu return flow: tear down game, show menu
45. Countdown sequence (3-2-1)
46. Song end: fade audio, settle particles, transition to results

### Sprint 10: Side Panels + Polish
47. Left panel mock (settings layout)
48. Right panel mock (leaderboard layout)
49. 2 more songs + beatmaps
50. Difficulty variants (easy/normal/hard) for all songs
51. Playtest, tune timing windows, cube speed, scoring thresholds

---

## Nice-to-Have (Documented, Not Built in Core)

### Tier 1 — High Impact

- **Music engine integration:** Port the advanced music generator (Markov chords, sigmoid instrument activation, energy curves, 7-instrument arrangement) to raw Web Audio API, or accept Tone.js + Tonal.js as dependencies. This turns simple beats into genuinely beautiful procedural songs. First priority upgrade.
- **Bloom post-processing:** `UnrealBloomPass` makes every emissive surface glow properly. Huge visual upgrade. May cost 10-15fps on Quest — profile first.
- **Combo multiplier scoring:** Consecutive hits increase multiplier (2x, 4x, 8x). Cut accuracy scoring based on swing angle precision.
- **Runtime theme switching:** Controller button cycles through theme pairs. Config is already a single object, just need UI trigger.

### Tier 2 — Feature Expansion

- **Obstacles:** Wall segments player must dodge (lean left/right) or duck under. New beatmap note type with lane span + height.
- **Bombs:** Black spiked spheres that must NOT be hit. New beatmap note type. Hit = score penalty.
- **Practice mode:** Slow speed (0.5x, 0.75x), start at timestamp, loop section.
- **Full menu browsing:** Search bar, sort by BPM/difficulty/name, favorites, song pack grouping. Currently center panel is minimal functional.
- **Polished side panels:** Working settings (volume actually changes gain, colors swap theme). Real leaderboard with localStorage persistence.

### Tier 3 — Advanced

- **Auto-beatmap generator:** FFT onset detection on audio → generate notes at detected beats. Works with any audio source.
- **Custom song import:** Load `.ogg`/`.mp3` + beatmap JSON from user files.
- **Community beatmap support:** Parse Beat Saber `.dat` format, load from BeatSaver API.
- **Multiplayer ghost:** Record play session, replay as transparent ghost alongside live player.
- **Hand tracking:** Use bare hands instead of controllers via WebXR Hand Input API.
- **Leaderboard (cloud):** Simple REST API + database for global scores.

---

## File Counts & Complexity Estimate

| Area | Files | Complexity |
|---|---|---|
| Core setup | 4 | Low |
| Scene/environment | 3 | Medium |
| Gameplay | 6 | High |
| Audio | 4 | Medium |
| Beatmap | 2 + 3 JSON | Low |
| XR/controllers | 4 | Medium |
| UI/menus | 7 | Medium |
| Utils | 4 | Low |
| **Total** | **~37 files** | |

Estimated lines of code: **2,500 - 3,500** for the complete core path.

---

## Key Design Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| Audio library | Raw Web Audio API | Zero deps, precise timing, no middleware lock-in |
| 3D engine | Three.js (direct) | The metal for 3D web, no wrappers |
| XR | Three.js renderer.xr | Thin built-in, saves boilerplate |
| UI framework | None (canvas textures in 3D) | Everything must work in VR, no HTML overlays |
| Physics | None (manual math) | Only need gravity on particles + line-box intersection |
| Beatmap format | Custom simple JSON | Minimal, easy to author, easy to parse |
| Music | Procedural synthesis | No audio files, no loading, no licensing |
| Geometry style | Rounded boxes everywhere | Softer look, consistent aesthetic |
| Color format | HSL only | Readable, tweakable, per project convention |
| Shadows | Disabled | Too expensive for Quest, emissive aesthetic doesn't need them |
