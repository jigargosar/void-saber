# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Void Saber — a Beat Saber clone for WebXR (Quest browser + desktop Chrome). Minimalist vertical slice: thin everywhere, complete end-to-end. Built with raw Three.js and Web Audio API, no wrapper libraries.

## Ignored Files: do not use as a source of standards or patterns

- docs\build-Instructions\VOID-SABER-BUILD-INSTRUCTIONS.md
- docs\build-Instructions\VOID-SABER-CODE-ARCHITECTURE.md

## Constants
- Most of the constants are dynamic configuration to be changed by user
- for e.g. theme colors.
- theme colors will automatically find its correct place, once we figure out other modules, otherwise it will be premature
  optimization
- same goes for other magic numbers once we find module boundaries it will be much easier to extract constants. 


## Commands

```bash
pnpm dev        # HTTPS dev server at https://localhost:5173 (SSL required for WebXR)
pnpm build      # tsc && vite build
pnpm preview    # serve production build
```

No test framework, linter, or formatter is configured.

## Stack

- **Three.js** (raw, no R3F/Drei) — 3D engine, WebGL, XR loop
- **Three.js `renderer.xr`** — WebXR session management
- **Raw Web Audio API** — `AudioContext`, `OscillatorNode`, `GainNode` (no Tone.js)
- **Vite** — build tool, HTTPS via `@vitejs/plugin-basic-ssl`
- **TypeScript** — strict mode, `noUnusedLocals`, `noUnusedParameters`
- **pnpm** — package manager

Dependency rule: if removing it costs 10x the code, keep it (Three.js). If 2x, skip it.

# Critical
- Every module must dispose all geometries, materials, and textures on cleanup — no orphaned GPU objects
- Never create heavy objects (geometries, materials, render targets) per-frame — create once, reuse across the lifetime

## Architecture

### Game Flow

```
Launch → Menu → Select Song → Play → Score Screen → Retry/Menu → ...
```

### State Machine

All game logic flows through a finite state machine (`state.ts`). States: `menu | countdown | playing | paused | results`. Every system is created/updated/disposed through state handlers wired in `main.ts`.

### Module Patterns (four kinds, no others)

1. **System Class** (`state.ts`) — single instance, minimal public API, private internals
2. **Factory Function** (`gameplay/sabers.ts`) — creates objects, returns interface with `root`, `update(dt)`, `dispose()`
3. **Entry Point** (`main.ts`) — wires systems, owns animation loop, zero game logic

### Dependency Flow (unidirectional, no cycles)

```
config.ts → utils/ → audio/ → beatmap/ → scene/ → gameplay/ → xr/ → ui/ → state.ts → main.ts
```

A file never imports from a file below it in this chain.

### System Lifecycle

Every game system: `create → attach to scene → update(dt) each frame → dispose on state exit`. No system starts itself, adds itself to the scene, or runs its own loop. `main.ts` controls everything through state handlers. Every `onEnter` has a matching `onExit` that undoes everything.


## Key Rules

- **HSL colors only** — never hex. `hsl()` in CSS, `new THREE.Color().setHSL()` in JS
- **Theme**: cyan left (`hsl(185, 100%, 55%)`), magenta right (`hsl(310, 100%, 60%)`), dark void environment
- **Audio is source of truth** — beat clock reads `AudioContext.currentTime`, never `Date.now()`
- **XR-first, desktop-second** — same code path for both
- **No globals** — pass `scene`, `renderer` as arguments, don't import them everywhere
- **Explicit dispose** — every geometry, material, texture gets `.dispose()` on cleanup
- **No event spaghetti** — direct function calls through state handler wiring

## Anti-Patterns

- `scene` as global import → pass as argument to factory functions
- `setTimeout` for game timing → `AudioContext.currentTime` via beat clock
- Giant `update()` functions → each system owns its `update(dt)`
- Re-creating geometries per frame → shared geometry instances from `utils/geometry.ts`
- Nested ternaries for state logic → state machine with clear handlers
- `any` types → explicit interfaces at every system boundary

## Build Phases

15 incremental phases documented in `docs/build-Instructions/PHASE-*.md`. Current status: Phases 1-2 implemented (scaffold + state machine), code was cleared for rebuild. Architecture doc at `docs/build-Instructions/VOID-SABER-CODE-ARCHITECTURE.md`.

## Design Reference

`design-playground.html` — standalone HTML file with theme colors, typography, button states, panel styling. Open directly in browser for visual reference.
