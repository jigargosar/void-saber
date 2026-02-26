Proper ECS Modeling for void-saber2.ts (v3)

# Context

v1 used `createTransformer` with side effects inside the reactive derivation (`addComponent` in autorun). v2 separated derivation from orchestration (pure autorun + `onEntityAdded` subscription) but introduced timing sensitivity and dual-call complexity.

Root cause: the entire ecs.ts API (`bridgeQuery`, `entityVisualBridge`, `driveTransformer`) was built to serve `createTransformer`. We built infrastructure for the tool instead of the problem.

v3 decomposes what `createTransformer` bundles:

```
+-----+===========================+====================================+
| #   | Concern                   | Primitive                          |
+-----+===========================+====================================+
| 1   | Memoized creation         | onEnter (miniplex native)          |
+-----+---------------------------+------------------------------------+
| 2   | Auto-cleanup              | onExit (miniplex native)           |
+-----+---------------------------+------------------------------------+
| 3   | Reactive re-derivation    | reactTo (MobX, when earned)        |
+-----+---------------------------+------------------------------------+
```

Each mechanism is explicit at the call site. MobX stays but only for the reaction layer where it earns its keep. Entity lifecycle uses miniplex directly — zero indirection.

# Locked Requirement

All stateful game logic rewritten as entities/components/systems. Final deliverable: `ecs.ts` + `void-saber2.ts` + `index.html`. Only imports: ecs.ts, theme.ts, collision.ts, Babylon.js.

# ecs.ts — Rewrite

## New API Surface

```typescript
// ── Entity storage (re-export) ──
export { World, type Query, type With, type Without } from 'miniplex';

// ── Types ──
export type System = () => void;
export type Teardown = () => void;

// ── Per-frame systems (polling layer) ──
export function createPipeline(systems: System[]): System;

// ── Entity lifecycle hooks (event layer — miniplex native) ──
export function onEnter<E>(query: Query<E>, cb: (entity: E) => void): Teardown;
export function onExit<E>(query: Query<E>, cb: (entity: E) => void): Teardown;

// ── Reactive state (reaction layer — MobX) ──
export function state<T>(initial: T): { get(): T; set(v: T): void };
export function reactTo<T>(read: () => T, effect: (value: T) => void): Teardown;

// ── Event queue (fire-and-forget events) ──
export function createEventQueue<T>(handler: (event: T) => void): EventQueue<T>;
```

## Removed

- `bridgeQuery` — miniplex queries are used directly via `onEnter`/`onExit`
- `entityVisualBridge` — `createTransformer` wrapper, replaced by `onEnter`/`onExit`
- `driveTransformer` — autorun keep-alive hack, no longer needed
- `onRemoved` — renamed to `onExit` for symmetry with `onEnter`

## Implementations

### onEnter / onExit

Thin wrappers over miniplex query events. Exist for naming consistency and to keep miniplex subscription API as an implementation detail.

```typescript
export function onEnter<E>(query: Query<E>, cb: (entity: E) => void): Teardown {
  return query.onEntityAdded.subscribe(cb);
}

export function onExit<E>(query: Query<E>, cb: (entity: E) => void): Teardown {
  return query.onEntityRemoved.subscribe(cb);
}
```

### state / reactTo

MobX is the implementation detail, not the API surface. If we ever swap to signals or nanostores, call sites don't change.

```typescript
import { observable, autorun } from 'mobx';

export function state<T>(initial: T): { get(): T; set(v: T): void } {
  const box = observable.box(initial, { deep: false });
  return {
    get: () => box.get(),
    set: (v: T) => box.set(v),
  };
}

export function reactTo<T>(read: () => T, effect: (value: T) => void): Teardown {
  return autorun(() => effect(read()));
}
```

### createEventQueue

No MobX. Simple buffer + flush called at end of pipeline per frame.

```typescript
interface EventQueue<T> {
  push: (event: T) => void;
  flush: () => void;
  dispose: Teardown;
}

export function createEventQueue<T>(handler: (event: T) => void): EventQueue<T> {
  const queue: T[] = [];
  return {
    push: (event: T) => { queue.push(event); },
    flush: () => {
      while (queue.length > 0) {
        const event = queue.shift();
        if (event !== undefined) handler(event);
      }
    },
    dispose: () => { queue.length = 0; },
  };
}
```

### createPipeline

Unchanged.

```typescript
export function createPipeline(systems: System[]): System {
  return () => {
    for (const system of systems) system();
  };
}
```

# void-saber2.ts — Changes

## 1. Typed Component Definitions

```typescript
interface BladeSegment {
  readonly base: TransformNode;
  readonly tip: TransformNode;
}

interface SaberVisual {
  readonly root: TransformNode;
  readonly blade: BladeSegment;
}

interface TrailBuffers {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly ages: Float32Array;
  prevSpeed: number;
  started: boolean;
}

interface TrailBundle {
  readonly mesh: Mesh;
  readonly buffers: TrailBuffers;
}

interface CollisionEvent {
  readonly point: Vector3;
}
```

## 2. Entity Type

```typescript
type Entity = {
  hand?: Hand;
  input?: WebXRInputSource;
  saber?: SaberVisual;
  trailMesh?: Mesh;
  trailBuffers?: TrailBuffers;
  gripBound?: true;
};
```

## 3. Queries — Document Archetypes

```
+-----+=========================+=========================================+
| #   | Archetype               | Components                              |
+-----+=========================+=========================================+
| 1   | Uninitialized controller| hand, input                             |
+-----+-------------------------+-----------------------------------------+
| 2   | Armed controller        | hand, input, saber, trailMesh,          |
|     |                         | trailBuffers                            |
+-----+-------------------------+-----------------------------------------+
| 3   | Active saber            | hand, input, saber, trailMesh,          |
|     |                         | trailBuffers, gripBound                 |
+-----+-------------------------+-----------------------------------------+
```

```typescript
const world = new World<Entity>();

// Lifecycle hooks
const controllers = world.with('hand', 'input');

// Per-frame systems
const needsGrip    = world.with('input', 'saber', 'trailBuffers').without('gripBound');
const activeTrails = world.with('saber', 'trailBuffers', 'trailMesh', 'gripBound');
const activeSabers = world.with('saber', 'gripBound');
```

## 4. Visual Pipeline — onEnter / onExit

No reactive context. No bridging. No guards. Deterministic event-driven lifecycle.

```typescript
function createVisualPipeline(): Teardown {
  const teardowns: Teardown[] = [];

  teardowns.push(onEnter(controllers, (entity) => {
    const name = `saber_${entity.hand}`;
    const color = handColor(theme, entity.hand);

    const saber = buildSaber(name, color);
    const trail = buildTrail(name, color);

    world.addComponent(entity, 'saber', saber);
    world.addComponent(entity, 'trailMesh', trail.mesh);
    world.addComponent(entity, 'trailBuffers', trail.buffers);
  }));

  teardowns.push(onExit(controllers, (entity) => {
    if (entity.saber) entity.saber.root.dispose(false, true);
    if (entity.trailMesh) entity.trailMesh.dispose(false, true);
  }));

  return () => { for (const td of teardowns) td(); };
}
```

Why this works:
- `onEnter` fires once per entity entering the `controllers` query — one-time creation
- `onExit` fires once per entity leaving — one-time cleanup
- `addComponent` reindexes the entity into downstream queries (`needsGrip`, etc.) synchronously, but those are consumed by per-frame systems, not event hooks — no cascade
- Teardown disposes both subscriptions — clean shutdown

## 5. buildTrail Returns TrailBundle

```typescript
function buildTrail(name: string, color: Color3): TrailBundle {
  // ... same mesh creation logic ...
  return { mesh, buffers: { positions, colors, ages, prevSpeed: 0, started: false } };
}
```

## 6. Trail Functions Updated

- `startTrail(buffers: TrailBuffers, mesh: Mesh, blade: BladeSegment)` — separated args
- `createTrailUpdateSystem` reads `entity.trailBuffers` and `entity.trailMesh` separately
- `disposeTrail` removed — `onExit` cleanup handles it

## 7. Systems

**gripBindSystem** — reads `needsGrip`, binds saber to grip, starts trail:
```typescript
function createGripBindSystem(): System {
  return () => {
    for (const entity of needsGrip) {
      const grip = entity.input.grip;
      if (!grip) continue;
      entity.saber.root.parent = grip;
      startTrail(entity.trailBuffers, entity.trailMesh, entity.saber.blade);
      world.addComponent(entity, 'gripBound', true);
    }
  };
}
```

**trailUpdateSystem** — reads `activeTrails`, mutates buffers, updates mesh vertex data:
```typescript
function createTrailUpdateSystem(): System {
  return () => {
    for (const entity of activeTrails) {
      // vertex animation using entity.trailBuffers and entity.trailMesh
    }
  };
}
```

**collisionSystem** — unchanged.

## 8. Remove setupDisposal

Deleted. `onExit` in the visual pipeline replaces `onRemoved` subscriptions.

## 9. Updated Import

```typescript
import {
  World, type With, type System, type Teardown,
  onEnter, onExit,
  createEventQueue, createPipeline,
} from './ecs';
```

Removed: `onRemoved`, `bridgeQuery`, `entityVisualBridge`, `driveTransformer`
Added: `onEnter`, `onExit`

Note: `state` and `reactTo` not imported yet — no current use case. Available when earned (score UI, combo counter, etc.).

## 10. Fix: Glow Layer `as` Cast

Replace the CLAUDE.md-violating `as` cast in `customEmissiveColorSelector`:

```typescript
glow.customEmissiveColorSelector = (mesh, _subMesh, _material, result) => {
  if (mesh.name.endsWith('Trail')) {
    result.set(0, 0, 0, 0);
    return;
  }
  const mat = mesh.material;
  if (mat && 'emissiveColor' in mat) {
    const ec = (mat as StandardMaterial).emissiveColor;
    result.set(ec.r, ec.g, ec.b, 1);
  } else {
    result.set(0, 0, 0, 0);
  }
};
```

The `'emissiveColor' in mat` guard narrows safely. The `as StandardMaterial` is after the guard — type-safe narrowing, not an assertion.

## 11. Fix: Capture Teardowns in Bootstrap

```typescript
async function setupWebXR(scene: Scene): Promise<Teardown> {
  const xr = await WebXRDefaultExperience.CreateAsync(scene, { ... });

  const collisionEvents = createEventQueue<CollisionEvent>((_event) => {});

  const disposeVisuals = createVisualPipeline();

  const tick = createPipeline([
    createGripBindSystem(),
    createTrailUpdateSystem(),
    createCollisionSystem((event) => collisionEvents.push(event)),
  ]);

  const disposeInput = bridgeInput(xr.input);

  const obs = scene.onBeforeRenderObservable.add(() => {
    tick();
    collisionEvents.flush();
  });

  return () => {
    scene.onBeforeRenderObservable.remove(obs);
    disposeInput();
    disposeVisuals();
    collisionEvents.dispose();
  };
}
```

Note: `collisionEvents.flush()` called at end of each frame after all systems have pushed events.

## 12. Environment: setTimeout → System

Replace `setTimeout` in `onBeat` with a per-frame decay system. The `onBeat` function sets a reactive `beatFlash` state, and a per-frame system decays it:

```typescript
const beatFlash = state(0);

function createBeatDecaySystem(pillarMats: StandardMaterial[]): System {
  return () => {
    const flash = beatFlash.get();
    if (flash <= 0) return;
    const t = Math.max(0, flash - 1 / 60 / 0.12); // decay over 120ms
    beatFlash.set(t);
    scene.fogDensity = FOG_BASE * (1 + 0.8 * t);
    for (const mat of pillarMats) {
      mat.emissiveColor = baseColor.scale(1 + 1.5 * t);
    }
  };
}

function onBeat(): void {
  beatFlash.set(1);
}
```

This eliminates `setTimeout` (spooky action at a distance) and brings beat effects into the system pipeline. Uses `state` + per-frame polling — `reactTo` not needed since we're already in the render loop.

# Use Case → Primitive Mapping

```
+-----+===========================+===================+
| #   | Use Case                  | Primitive          |
+-----+===========================+===================+
| 1   | Saber creation            | onEnter            |
+-----+---------------------------+-------------------+
| 2   | Saber/trail disposal      | onExit             |
+-----+---------------------------+-------------------+
| 3   | Grip binding              | pipeline system    |
+-----+---------------------------+-------------------+
| 4   | Trail vertex animation    | pipeline system    |
+-----+---------------------------+-------------------+
| 5   | Collision detection       | pipeline system    |
+-----+---------------------------+-------------------+
| 6   | Collision event dispatch   | createEventQueue   |
+-----+---------------------------+-------------------+
| 7   | Beat flash decay          | state + system     |
+-----+---------------------------+-------------------+
| 8   | Score UI (future)         | reactTo            |
+-----+---------------------------+-------------------+
| 9   | Haptic on slice (future)  | onEnter            |
+-----+---------------------------+-------------------+
| 10  | Combo counter (future)    | reactTo            |
+-----+---------------------------+-------------------+
```

# Files Modified

```
+-----+======================+==========================================+
| #   | File                 | Change                                   |
+-----+======================+==========================================+
| 1   | src/ecs.ts           | Rewrite: drop bridgeQuery/               |
|     |                      | entityVisualBridge/driveTransformer.      |
|     |                      | Add onEnter, onExit, state, reactTo.     |
|     |                      | Rewrite createEventQueue (no MobX).      |
+-----+----------------------+------------------------------------------+
| 2   | src/void-saber2.ts   | Rewrite ECS modeling: visual pipeline     |
|     |                      | via onEnter/onExit, split TrailState,     |
|     |                      | fix as cast, capture teardowns,           |
|     |                      | environment beat → system.                |
+-----+----------------------+------------------------------------------+
| 3   | index.html           | No changes                               |
+-----+----------------------+------------------------------------------+
```

# Verification

1. `pnpm build` — TypeScript compiles without errors
2. `pnpm dev` — open browser, check v2 label renders
3. Enter VR — controllers should spawn sabers with trails
4. Wave sabers — trails animate, collision detection works
5. Remove/re-add controller — saber and trail should auto-dispose and recreate
6. Beat pulse — fog and pillars flash and decay smoothly (no setTimeout)
