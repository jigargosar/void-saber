# Void Saber — Code Architecture

> Rules for how code is organized. Every file follows these patterns.
> Reference: `config.ts`, `main.ts`, `state.ts` are the gold standard.

---

## Core Principles

1. **Each file does one thing.** If you can't describe it in one sentence, split it.
2. **Data files export data. Logic files export functions/classes.** Never mix.
3. **No deep callback chains.** If nesting goes beyond 2 levels, refactor.
4. **Explicit over clever.** Readable code beats short code.

---

## Module Patterns

### Pattern 1: Pure Config (no logic, no imports from project files)

```typescript
// config.ts — ONLY data. No functions. No side effects.
export const GAMEPLAY = {
  CUBE_SPAWN_DISTANCE: 50,
  CUBE_SPEED: 15,
};
```

**Used by:** `config.ts`, beatmap JSON files, theme definitions.

### Pattern 2: System Class (single instance, clean API surface)

```typescript
// state.ts — Class with minimal public API. Internal state is private.
class StateMachine {
  private currentState: GameState = 'menu';
  private handlers: Partial<Record<GameState, StateHandlers>> = {};

  setState(state: GameState) { /* ... */ }
  getState(): GameState { return this.currentState; }
  on(state: GameState, handlers: StateHandlers) { /* ... */ }
  update(dt: number) { /* ... */ }
}

// Single export at bottom. One instance. No global mutation.
export const stateMachine = new StateMachine();
```

**Used by:** `state.ts`, `audio/engine.ts`, `gameplay/scoring.ts`, `utils/pool.ts`.

### Pattern 3: Factory Function (creates objects, returns interface)

```typescript
// gameplay/sabers.ts — Creates and returns a clean interface. No class needed.
export interface Sabers {
  root: THREE.Group;
  left: THREE.Group;
  right: THREE.Group;
  update(dt: number): void;
  dispose(): void;
}

export function createSabers(theme: Theme): Sabers {
  // All internal state lives in closure
  const root = new THREE.Group();
  // ... build meshes ...

  return {
    root,
    left: leftGroup,
    right: rightGroup,
    update(dt) { /* trail update, etc */ },
    dispose() { /* cleanup geometries, materials */ },
  };
}
```

**Used by:** `sabers.ts`, `corridor.ts`, `particles.ts`, `cubes.ts`, `menu-scene.ts`.

### Pattern 4: Entry Point (wires systems together, owns the loop)

```typescript
// main.ts — Creates systems, connects them, runs the loop.
// Does NOT contain game logic. Only orchestration.
import { stateMachine } from './state';
import { createSabers } from './gameplay/sabers';

const renderer = new THREE.WebGLRenderer({ /* ... */ });
const scene = new THREE.Scene();

// Wire state handlers
stateMachine.on('playing', {
  onEnter: () => { /* add game objects to scene */ },
  onUpdate: (dt) => { /* call system updates */ },
  onExit: () => { /* dispose, cleanup */ },
});

// The loop — thin, just dispatches
renderer.setAnimationLoop((time, frame) => {
  stateMachine.update(dt);
  renderer.render(scene, camera);
});
```

**Only `main.ts` uses this pattern.** Everything else is a system that gets called.

---

## File Communication Rules

### ✅ DO

- Import config values: `import { GAMEPLAY } from '../config'`
- Import factory functions: `import { createSabers } from './sabers'`
- Import singleton systems: `import { stateMachine } from '../state'`
- Pass dependencies as function arguments: `createCubes(scene, beatClock)`
- Return clean interfaces from factory functions
- Use typed events for cross-system communication

### ❌ DON'T

- Import a file just for its side effects
- Reach into another module's internals
- Store references to `scene` or `renderer` in random files — pass them in
- Use global variables or `window.*` for state
- Create circular imports — if A needs B and B needs A, extract the shared thing into C
- Put logic in config files
- Put config in logic files

---

## Dependency Flow (one direction, no cycles)

```
config.ts (pure data, zero imports)
    ↓
utils/ (math, pool, geometry, clock — import only config)
    ↓
audio/ (engine, drums, synths, songs — import config + utils)
    ↓
beatmap/ (types, loader — import config + utils)
    ↓
scene/ (corridor, environment, lighting — import config + utils)
    ↓
gameplay/ (cubes, sabers, trails, collision, particles, scoring — import all above)
    ↓
xr/ (controllers, haptics, pointer — import config + utils)
    ↓
ui/ (panels, hud, results, text — import config + utils + state)
    ↓
state.ts (state machine — imports nothing from project, pure standalone)
    ↓
main.ts (imports everything, wires it all together)
```

**Rule:** arrows point down only. A file never imports from a file below it in this chart.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `panel-center.ts` |
| Exported constants | UPPER_SNAKE | `CUBE_SPEED` |
| Exported functions | camelCase, verb-first | `createSabers()`, `updateTrail()` |
| Exported classes | PascalCase | `StateMachine` |
| Exported interfaces | PascalCase | `GameScore`, `Sabers` |
| Exported types | PascalCase | `GameState`, `Direction` |
| Private/internal | prefixed `_` or closure-scoped | `private _handlers` or just `const handlers` in closure |
| Config objects | UPPER_SNAKE namespace | `GAMEPLAY.CUBE_SPEED` |

---

## System Lifecycle

Every game system follows the same lifecycle:

```typescript
// 1. Create — returns interface with update + dispose
const sabers = createSabers(theme);

// 2. Attach to scene
scene.add(sabers.root);

// 3. Update every frame (called from main loop via state handler)
sabers.update(dt);

// 4. Dispose on state exit (explicit cleanup, no garbage)
sabers.dispose();
scene.remove(sabers.root);
```

**No system starts itself.** No system adds itself to the scene. No system runs its own loop. `main.ts` controls when things are created, updated, and destroyed — through state machine handlers.

---

## State Handler Wiring

Each game state assembles its own set of systems:

```typescript
// In main.ts — playing state example
let sabers: Sabers | null = null;
let cubes: CubeSystem | null = null;

stateMachine.on('playing', {
  onEnter() {
    sabers = createSabers(theme);
    cubes = createCubeSystem(scene, beatClock);
    scene.add(sabers.root);
  },
  onUpdate(dt) {
    sabers?.update(dt);
    cubes?.update(dt);
  },
  onExit() {
    sabers?.dispose();
    cubes?.dispose();
    scene.remove(sabers!.root);
    sabers = null;
    cubes = null;
  },
});
```

**Every `onEnter` has a matching `onExit` that undoes everything.** No leaked objects, no orphan meshes, no dangling audio nodes.

---

## Anti-Patterns to Avoid

| ❌ Bad | ✅ Good |
|---|---|
| `scene` as global, imported everywhere | Pass `scene` as argument to factory functions |
| `setTimeout` for game timing | `AudioContext.currentTime` via beat clock |
| Event emitter spaghetti between 5+ systems | Direct function calls through state handler wiring |
| Giant `update()` with 200 lines | Each system has its own `update(dt)`, main loop just calls them |
| `any` types | Explicit interfaces for every system boundary |
| Dispose "later" or "when GC gets it" | Explicit `.dispose()` on every geometry, material, texture |
| Nested ternaries for state logic | State machine with clear handlers |
| Re-creating geometries per frame | Shared geometry instances from `utils/geometry.ts` |
