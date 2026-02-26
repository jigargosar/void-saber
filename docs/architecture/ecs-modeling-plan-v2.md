Proper ECS Modeling for void-saber2.ts (v2)

# Context

Current void-saber2.ts has shallow ECS — old callback code reorganized with miniplex queries as filters. Entity type is a bag of optional properties with no meaningful component definitions. `saberSetupSystem` is a per-frame polling system that builds visuals and calls `addComponent`. Disposal is manual via `onRemoved` subscriptions. The architecture docs prescribe `createTransformer` (via `entityVisualBridge`) as "the most important pattern" for entity→visual lifecycle. This plan restructures the file to properly leverage the ECS framework.

v2 fixes: separated derivation from orchestration in visual pipeline — no side effects inside reactive context, no fragile `in` guards.

# Locked Requirement

All stateful game logic rewritten as entities/components/systems. Final deliverable: `ecs.ts` + `void-saber2.ts` + `index.html`. Only imports: ecs.ts, theme.ts, collision.ts, Babylon.js.

# Changes

## 1. Typed Component Definitions

Replace inline optional properties with named interfaces:

```typescript
interface BladeSegment {           // unchanged
  readonly base: TransformNode;
  readonly tip: TransformNode;
}

interface SaberVisual {            // unchanged
  readonly root: TransformNode;
  readonly blade: BladeSegment;
}

interface TrailBuffers {           // NEW — split from TrailState
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly ages: Float32Array;
  prevSpeed: number;
  started: boolean;
}

interface CollisionEvent {         // unchanged
  readonly point: Vector3;
}
```

## 2. Entity Type — Separate Data from Visual

```typescript
type Entity = {
  hand?: Hand;
  input?: WebXRInputSource;
  saber?: SaberVisual;           // visual — created by reactive pipeline
  trailMesh?: Mesh;              // visual — created by reactive pipeline
  trailBuffers?: TrailBuffers;   // data — mutated per-frame by trail system
  gripBound?: true;              // marker
};
```

Key change: `trail` → split into `trailMesh` (visual, lifecycle managed by transformer) + `trailBuffers` (data, mutated by per-frame system).

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

// Reactive pipeline (visual creation)
const controllers = world.with('hand', 'input');

// Per-frame systems
const needsGrip    = world.with('input', 'saber', 'trailBuffers').without('gripBound');
const activeTrails = world.with('saber', 'trailBuffers', 'trailMesh', 'gripBound');
const activeSabers = world.with('saber', 'gripBound');
```

Note: `needsSaber` query removed. `withSaber`/`withTrailAny` (cleanup-only queries) removed — transformer handles cleanup automatically.

## 4. Reactive Visual Pipeline — Replace saberSetupSystem

Replace the per-frame polling `createSaberSetupSystem` with a reactive pipeline. Two concerns are separated:

- **Derivation** (`driveTransformer`) — keeps transformer entries alive in a reactive context. Pure, no side effects. When entity leaves the bridged array, the autorun re-runs, the entity is no longer iterated, and `createTransformer`'s `onCleanup` fires to dispose visuals.
- **Orchestration** (`onEntityAdded`) — one-time component attachment when a controller entity appears. Calls the same transformers (which create-and-cache on first call, return cached on subsequent calls), then attaches the results as components.

```typescript
function createVisualPipeline(): Teardown {
  const { entities, dispose: disposeBridge } = bridgeQuery(controllers);

  const toSaber = entityVisualBridge(
    (e: With<Entity, 'hand'>) => buildSaber(`saber_${e.hand}`, handColor(theme, e.hand)),
    (v) => { if (v) v.root.dispose(false, true); }
  );

  const toTrail = entityVisualBridge(
    (e: With<Entity, 'hand'>) => buildTrail(`saber_${e.hand}`, handColor(theme, e.hand)),
    (v) => { if (v) v.mesh.dispose(false, true); }
  );

  // Derivation: keep transformer entries alive in reactive context
  const disposeDriver = driveTransformer(entities, (entity) => {
    toSaber(entity);
    toTrail(entity);
  });

  // Orchestration: one-time create + attach components
  const unsub = controllers.onEntityAdded.subscribe((entity) => {
    const saber = toSaber(entity);
    const trail = toTrail(entity);
    world.addComponent(entity, 'saber', saber);
    world.addComponent(entity, 'trailMesh', trail.mesh);
    world.addComponent(entity, 'trailBuffers', trail.buffers);
  });

  return () => { disposeDriver(); disposeBridge(); unsub(); };
}
```

Why `controllers` (not `needsSaber`): Bridging a `.without('saber')` query would eject the entity from the bridged array the moment `addComponent` adds `saber`, triggering transformer cleanup and immediately disposing the just-created visual. Bridging the broader `controllers` query keeps the entity in the array until it's removed from the world.

Disposal chain: `world.remove(entity)` → leaves `controllers` query → bridged array removes entity → autorun re-runs (entity not iterated) → `createTransformer` `onCleanup` fires for both saber and trail → meshes + materials disposed.

Timing: `onEntityAdded` fires synchronously on `world.add()`. The transformer call inside creates and caches the visual. The next autorun tick calls the same transformers, gets cached results, and keeps the memoization entries alive. Between the subscription and autorun flush, the WeakMap entry persists — `createTransformer` only garbage-collects entries when a reaction that previously observed them re-runs without observing them. No reaction has run yet, so no cleanup trigger exists.

## 5. buildTrail Returns TrailBundle

```typescript
interface TrailBundle {
  readonly mesh: Mesh;
  readonly buffers: TrailBuffers;
}

function buildTrail(name: string, color: Color3): TrailBundle {
  // ... same mesh creation logic ...
  return { mesh, buffers: { positions, colors, ages, prevSpeed: 0, started: false } };
}
```

## 6. Trail Functions Updated

- `startTrail(buffers: TrailBuffers, mesh: Mesh, blade: BladeSegment)` — takes separated args
- Trail update logic in `createTrailUpdateSystem` reads `entity.trailBuffers` and `entity.trailMesh` separately
- `disposeTrail` function removed — transformer cleanup handles it

## 7. Systems — Updated Signatures

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

Note: `needsGrip` query now checks for `trailBuffers` (not `trail`). The `trailMesh` check is implicit since both are added together by the visual pipeline.

**trailUpdateSystem** — reads `activeTrails`, mutates buffers, updates mesh vertex data:
```typescript
function createTrailUpdateSystem(): System {
  return () => {
    for (const entity of activeTrails) {
      // ... same vertex animation logic, using entity.trailBuffers and entity.trailMesh ...
    }
  };
}
```

**collisionSystem** — unchanged.

## 8. Remove setupDisposal

Delete `setupDisposal()` and its call in `setupWebXR`. The `onRemoved` import from ecs.ts is no longer needed. Transformer auto-cleanup replaces manual disposal subscriptions.

## 9. Updated Import

```typescript
import {
  World, type With, type System, type Teardown,
  bridgeQuery, entityVisualBridge, driveTransformer,
  createEventQueue, createPipeline,
} from './ecs';
```

- Added: `With`, `bridgeQuery`, `entityVisualBridge`, `driveTransformer`
- Removed: `onRemoved`

## 10. Bootstrap Sequence

```typescript
async function setupWebXR(scene: Scene): Promise<void> {
  const xr = await WebXRDefaultExperience.CreateAsync(scene, { ... });

  const collisionEvents = createEventQueue<CollisionEvent>((_event) => {});

  // Reactive visual pipeline (saber + trail lifecycle)
  createVisualPipeline();

  // Per-frame systems (grip bind, trail update, collision)
  const tick = createPipeline([
    createGripBindSystem(),
    createTrailUpdateSystem(),
    createCollisionSystem((event) => collisionEvents.push(event)),
  ]);

  bridgeInput(xr.input);
  scene.onBeforeRenderObservable.add(() => tick());
}
```

Order: visual pipeline set up before input bridge — ensures transformer is ready to react when first entity enters.

## 11. No Changes to ecs.ts

All needed utilities already exist: `bridgeQuery`, `entityVisualBridge`, `driveTransformer`, `createEventQueue`, `createPipeline`.

# Files Modified

```
+-----+======================+========================================+
| #   | File                 | Change                                 |
+-----+======================+========================================+
| 1   | src/void-saber2.ts   | Rewrite ECS modeling (this plan)       |
+-----+----------------------+----------------------------------------+
| 2   | src/ecs.ts           | No changes                             |
+-----+----------------------+----------------------------------------+
| 3   | index.html           | No changes                             |
+-----+----------------------+----------------------------------------+
```

# Verification

1. `pnpm build` — TypeScript compiles without errors
2. `pnpm dev` — open browser, check v2 label renders
3. Enter VR — controllers should spawn sabers with trails
4. Wave sabers — trails animate, collision detection works
5. Remove/re-add controller — saber and trail should auto-dispose and recreate
