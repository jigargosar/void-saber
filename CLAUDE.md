# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Goal: Quickly finish end-to-end prototype.

See docs/BUILD-GUIDE.md for detailed build guidance.

# Principles

- Follow TDA, PLOP, and Encapsulation
- Strict: cleanup, no memory leaks
- Strict: no double computations — if something can be pre-calculated, it must not be repeated
- Strict: never swallow any error — either fail hard or log, based on whether it makes sense to continue or it completely breaks app
- Strict: no spooky action at a distance

# TypeScript

- No hacks, no `as`, no `!`, etc.

# Scripts

- `pnpm dev` — Vite dev server (HTTPS via basicSsl, required for WebXR on Quest 2)
- `pnpm build` — tsc && vite build
- `pnpm preview` — preview production build

No test runner or linter is configured.

# Architecture

VR Beat Saber clone: Babylon.js (3D/WebXR) + ECS + MobX (reactive state, reserved for future UI).

Two parallel ECS implementations exist for evaluation:
- `src/game/` — Miniplex-based (original)
- `src/game-koota/` — Koota-based (spike, may replace Miniplex)

## Entry Points

- `index.html` → `src/game/main.ts` — Miniplex game
- `game-koota.html` → `src/game-koota/main.ts` — Koota game
- `sandbox-arena.html` → `src/sandbox/arena/main.ts` — Koota learning spike (2D Canvas)

## Shared Modules

- `src/collision.ts` — `segmentDistance()` — robust 3D line-segment closest-distance
- `src/theme.ts` — `Hand` type alias, `Theme` interface (leftHand/rightHand colors), `handColor()` lookup
- `src/music-engine.ts` — procedural song generation (seed → deterministic song). Pure data, no audio.
- `src/ecs.ts` — thin wrappers over Miniplex + MobX (used by `src/game/` only)

## Miniplex ECS Stack (`src/game/`)

Thin wrappers over Miniplex + MobX in `src/ecs.ts`. Key primitives:

- `onEnter(query, cb)` / `onExit(query, cb)` — entity lifecycle hooks (creation/disposal)
- `state(initial)` / `reactTo(read, effect)` — MobX-backed reactive cells (not yet used in game)
- `createEventQueue(handler)` — plain array buffer, flushed at frame end
- `createPipeline(systems, queues)` — runs all systems then flushes all queues per frame

All return `Teardown` (cleanup function). Systems are `() => void`.

Single `Entity` type with optional components. Three archetype stages:

1. **Uninitialized controller** — `{ hand, input }` — WebXR controller just connected
2. **Armed controller** — adds `saber`, `trailMesh`, `trailBuffers` — visual pipeline built geometry
3. **Active controller** — adds `gripBound: true` — saber parented to grip, systems running

## Koota ECS Stack (`src/game-koota/`)

Direct Koota API, no wrapper layer. Key patterns:

- `trait(() => obj)` — callback traits (AoS) for Babylon.js object references
- `trait()` — tag traits for entity-kind markers (GripBound)
- `world.onQueryAdd([...traits], cb)` / `world.onQueryRemove([...traits], cb)` — lifecycle hooks
- `world.spawn(Trait(value), ...)` — entity creation with initial trait values
- `entity.destroy()` — cleanup (triggers onQueryRemove hooks)
- `Not(Trait)` — query modifier for `.without()` equivalent
- Manual event buffer + system ordering (no pipeline abstraction)

Same archetype stages as Miniplex version. Same game systems, different ECS plumbing.

## Game Systems (both implementations)

Systems run in order inside `scene.onBeforeRenderObservable`:

1. **Visual Pipeline** — lifecycle hooks on controllers query. Creates sabers + trails on connect, disposes on disconnect.
2. **Grip Bind** — polling system. Parents saber to XR grip, starts trail, adds gripBound flag.
3. **Trail Update** — shifts 60-sample vertex ribbon, ages samples, updates Babylon vertex buffers directly.
4. **Collision** — segment-distance between saber blades, pushes collision event to buffer.
5. **Beat Decay** (inside `environment.ts`) — decays `beatFlash` for fog/pillar pulse. Frame-rate independent via `getDeltaTime()`.

## Bootstrap

`startGame(canvas)` / `main()` creates engine → scene → camera → environment → WebXR → systems → pipeline → input bridge → render loop.

## Conventions

- **`dispose(false, true)`**: Disposes node + materials + textures for full cleanup.
- **Trail mesh**: 120 vertices (60 samples × 2), mutable Float32Array buffers updated via `updateVerticesData`.
- **Theme**: `src/theme.ts` defines `Hand` type alias, `Theme` interface, `handColor()` lookup.

## Sandboxes (`src/sandbox/`)

Small standalone games for learning ECS concepts:

- `arena/` — Koota learning spike. Top-down survival shooter (Canvas2D, dark theme). See `docs/spikes/arena/arena-design.md`.
- `guard-the-gate/` — Miniplex learning spike. 2D tower defense (SVG). See `docs/spikes/ecs-sandbox/`.

## Key Dependencies

- `@babylonjs/core`, `@babylonjs/loaders` — 3D engine + WebXR
- `koota` — ECS (spike, evaluating as Miniplex replacement)
- `miniplex` — ECS (original)
- `mobx` — reactive state (future UI layer)
- `planck` — 2D physics / Vec2 math (sandboxes)
- `tone`, `tonal` — audio synthesis + music theory
