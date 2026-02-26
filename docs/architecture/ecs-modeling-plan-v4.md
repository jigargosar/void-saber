Proper ECS Modeling for void-saber2.ts (v4)

# Context

v3 established the decomposed API: `onEnter`/`onExit` (miniplex native) for entity lifecycle, `state`/`reactTo` (MobX) for reactive layer, `createEventQueue` (plain JS) for events, `createPipeline` for per-frame systems.

v4 fixes: frame-rate dependent decay, unsound type guard, stale use-case table, unused return value at top level, removed documentation-as-bandaid.

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
export function createPipeline(systems: System[], queues?: EventQueue<unknown>[]): System;

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
import { observable, reaction } from 'mobx';

export function state<T>(initial: T): { get(): T; set(v: T): void } {
  const box = observable.box(initial, { deep: false });
  return {
    get: () => box.get(),
    set: (v: T) => box.set(v),
  };
}

export function reactTo<T>(read: () => T, effect: (value: T) => void): Teardown {
  return reaction(read, effect, { fireImmediately: true });
}
```

Uses `reaction` (not `autorun`) — only tracks observables in the `read` function. The `effect` callback is untracked, so any observable reads inside it (e.g., accessing game state to update UI) won't cause spurious re-triggers.

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
      for (let i = 0; i < queue.length; i++) handler(queue[i]);
      queue.length = 0;
    },
    dispose: () => { queue.length = 0; },
  };
}
```

### createPipeline

Accepts optional event queues. Systems run first, then all queues flush. Consumer can't forget to flush or flush in wrong order.

```typescript
export function createPipeline(systems: System[], queues?: EventQueue<unknown>[]): System {
  return () => {
    for (const system of systems) system();
    if (queues) for (const q of queues) q.flush();
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

    world.update(entity, {
      saber,
      trailMesh: trail.mesh,
      trailBuffers: trail.buffers,
    });
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
- `world.update` sets all components via `Object.assign` then reindexes once — downstream queries see the fully-built entity atomically, no cascading `onEnter` on intermediate states
- Verified: miniplex preserves entity object intact in `onEntityRemoved` callbacks (both for `world.remove` and `removeComponent`)
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
  if (mesh.material instanceof StandardMaterial) {
    const ec = mesh.material.emissiveColor;
    result.set(ec.r, ec.g, ec.b, 1);
  } else {
    result.set(0, 0, 0, 0);
  }
};
```

`instanceof StandardMaterial` is a proper TypeScript narrowing — no `as`, no custom type guard, and truthful (it IS a StandardMaterial, so `.emissiveColor` is guaranteed to be `Color3`).

## 11. Bootstrap

```typescript
async function setupWebXR(scene: Scene): Promise<void> {
  const xr = await WebXRDefaultExperience.CreateAsync(scene, { ... });

  const collisionEvents = createEventQueue<CollisionEvent>((_event) => {});

  const disposeVisuals = createVisualPipeline();

  const tick = createPipeline(
    [
      createGripBindSystem(),
      createTrailUpdateSystem(),
      createCollisionSystem((event) => collisionEvents.push(event)),
    ],
    [collisionEvents],
  );

  const disposeInput = bridgeInput(xr.input);

  scene.onBeforeRenderObservable.add(() => tick());
}
```

`setupWebXR` returns `Promise<void>` — no teardown exposed. The game runs until page close; teardown at the top level would never be called. Internal teardown references (`disposeVisuals`, `disposeInput`) are captured in the closure for future use if shutdown logic is added.

Event queues are registered with the pipeline — no manual `flush()` calls needed.

## 12. Environment: setTimeout → System

Replace `setTimeout` in `onBeat` with a per-frame decay system:

```typescript
interface PillarSnapshot {
  readonly mat: StandardMaterial;
  readonly baseColor: Color3;
}

let beatFlash = 0;

function createBeatDecaySystem(
  scene: Scene,
  pillars: readonly PillarSnapshot[],
): System {
  const engine = scene.getEngine();
  return () => {
    if (beatFlash <= 0) return;
    const dt = engine.getDeltaTime() / 1000;
    const t = Math.max(0, beatFlash - dt / 0.12);
    beatFlash = t;
    scene.fogDensity = FOG_BASE * (1 + 0.8 * t);
    for (const { mat, baseColor } of pillars) {
      mat.emissiveColor = baseColor.scale(1 + 1.5 * t);
    }
  };
}

function onBeat(): void {
  beatFlash = 1;
}
```

`PillarSnapshot` captures each material alongside its original base color at creation time.

Plain `let` — no `state()`. This value is set by `onBeat()` and read by a per-frame system. No MobX involvement needed. Reserve `state` + `reactTo` exclusively for the UI reaction layer where reactivity is actually consumed.

Frame-rate independent: `engine.getDeltaTime()` returns actual ms since last frame. Decay is consistent at 60fps, 72fps, 90fps, or 120fps.

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
| 7   | Beat flash decay          | let + system       |
+-----+---------------------------+-------------------+
| 8   | Score UI (future)         | reactTo            |
+-----+---------------------------+-------------------+
| 9   | Haptic on slice (future)  | onEnter            |
+-----+---------------------------+-------------------+
| 10  | Combo counter (future)    | reactTo            |
+-----+---------------------------+-------------------+
```

# Userland Risks

Risks that cannot be eliminated through API design — inherent to thin wrappers over mutable ECS state.

```
+-----+================================+==========================================+
| #   | Risk                           | Why it can't be solved in the API        |
+-----+================================+==========================================+
| 1   | Double-disposal on overlapping | Multiple onExit hooks on related queries |
|     | onExit hooks                   | both fire on world.remove(). Babylon's   |
|     |                                | dispose() is idempotent — no crash, but  |
|     |                                | wasted work. Preventing this requires    |
|     |                                | tracking which hook "owns" which         |
|     |                                | resource — coupling the framework to     |
|     |                                | resource types.                          |
+-----+--------------------------------+------------------------------------------+
| 2   | Bypassing lifecycle via direct  | world is re-exported from miniplex.      |
|     | world.remove() /               | Wrapping it would hide the query API     |
|     | world.addComponent()           | and add indirection for zero benefit     |
|     |                                | in a single-developer codebase.          |
|     |                                | Callers can remove entities or strip     |
|     |                                | components in ways that skip onExit      |
|     |                                | hooks on unrelated queries.              |
+-----+--------------------------------+------------------------------------------+
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
7. Beat pulse at 90fps — same visual duration as 60fps (frame-rate independent)
