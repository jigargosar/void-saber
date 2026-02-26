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

VR Beat Saber clone: Babylon.js (3D/WebXR) + Miniplex (ECS) + MobX (reactive state, reserved for future UI).

## ECS Stack (`src/ecs.ts`)

Thin wrappers over Miniplex + MobX. Key primitives:

- `onEnter(query, cb)` / `onExit(query, cb)` — entity lifecycle hooks (creation/disposal)
- `state(initial)` / `reactTo(read, effect)` — MobX-backed reactive cells (not yet used in game)
- `createEventQueue(handler)` — plain array buffer, flushed at frame end
- `createPipeline(systems, queues)` — runs all systems then flushes all queues per frame

All return `Teardown` (cleanup function). Systems are `() => void`.

## Entity Model (`src/game/types.ts`, `src/game/world.ts`)

Single `Entity` type with optional components. Three archetype stages:

1. **Uninitialized controller** — `{ hand, input }` — WebXR controller just connected
2. **Armed controller** — adds `saber`, `trailMesh`, `trailBuffers` — visual pipeline built geometry
3. **Active controller** — adds `gripBound: true` — saber parented to grip, systems running

Queries in `world.ts` filter by archetype: `controllers`, `needsGrip`, `activeTrails`, `activeSabers`.

## Game Systems

Systems run in order inside `scene.onBeforeRenderObservable`:

1. **Visual Pipeline** (`visual-pipeline.ts`) — `onEnter`/`onExit` on controllers query. Creates sabers + trails on connect, disposes on disconnect. Uses `world.update()` for atomic multi-component add.
2. **Grip Bind** (`grip-bind-system.ts`) — polling system. Parents saber to XR grip, starts trail, adds `gripBound` flag.
3. **Trail Update** (`trail-update-system.ts`) — shifts 60-sample vertex ribbon, ages samples, updates Babylon vertex buffers directly.
4. **Collision** (`collision-system.ts`) — segment-distance between saber blades, pushes `CollisionEvent` to queue.
5. **Beat Decay** (inside `environment.ts`) — decays `beatFlash` for fog/pillar pulse. Frame-rate independent via `getDeltaTime()`.

## Bootstrap (`src/game/main.ts`)

`startGame(canvas)` creates engine → scene → camera → environment → WebXR → systems → pipeline → input bridge → render loop.

## Conventions

- **`dispose(false, true)`**: Disposes node + materials + textures for full cleanup.
- **Trail mesh**: 120 vertices (60 samples × 2), mutable Float32Array buffers updated via `updateVerticesData`.
- **Collision geometry**: `segmentDistance()` in `src/collision.ts` — robust 3D line-segment closest-distance.
- **Theme**: `src/theme.ts` defines `Hand` type alias, `Theme` interface (leftHand/rightHand colors), `handColor()` lookup.

## Key Dependencies

- `@babylonjs/core`, `@babylonjs/loaders` — 3D engine + WebXR
- `miniplex` — entity-component storage with typed queries
- `mobx` — reactive state (future UI layer)
