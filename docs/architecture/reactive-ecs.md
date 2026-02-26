Reactive ECS Architecture
Date: 2026-02-26
Status: Design — awaiting prototype validation

# Problem

Babylon.js's observable pattern leads to nested callbacks, hidden subscriptions,
and tight coupling between hardware events and game logic. Reading the code doesn't
reveal what runs, when, or why. Adding new behavior (particles, haptics, scoring)
requires modifying existing callback chains. Disposing resources is manual and
error-prone across multiple concerns (meshes, materials, observers).

A Beat Saber clone amplifies this: sabers, blocks, trails, particles, scoring,
audio sync, haptics, obstacles, menus — all interacting through events that
multiply coupling with each new feature.

# Babylon.js Runtime Behavior (Verified)

We tested every assumption using NullEngine in isolated Node.js scripts.
Nothing here is assumed from documentation.

**Scene registration vs parenting are independent:**
- `new TransformNode(name, scene)` registers in `scene.transformNodes` with `parent = null`
- `.parent = node` sets transform hierarchy but does NOT transfer scene membership
- In a two-scene setup, child defaults to `LastCreatedScene`, not parent's scene
- This produces silent cross-scene bugs with no error or warning

**Disposal cascades down, not up:**
- `root.dispose(false, true)` disposes all children AND their materials
- `root.dispose()` without the second arg leaves materials in the scene (leak)
- Disposing a child removes it from parent's `getChildren()` list — no stale refs
- Disposing a child does not affect parent

**`LastCreatedScene` is a hidden global singleton:**
- If scene is omitted from constructor, `EngineStore.LastCreatedScene` is used silently
- No validation, no warning — just assigns whatever was last created
- Scene constructor itself requires a valid Engine — no engine = crash

Decision: rely on implicit scene assignment for simpler signatures.
See [ADR-001](../adr/001-implicit-scene-assignment.md) for rationale and trade-offs.

# Architecture: ECS + Reactive Primitives

Two libraries, one pattern: entities hold data, reactive functions bridge data to visuals,
systems process entities per frame.

## Miniplex — Entity Storage + Typed Queries

Entities are plain TypeScript objects. Components are properties. Queries are type-safe.

```typescript
type Entity = {
  position: { x: number; y: number; z: number };
  blade?: { base: TransformNode; tip: TransformNode };
  trail?: Trail;
  gripBound?: true;  // marker component = tag
};

const world = new World<Entity>();
const sabers = world.with("blade", "position");
const unbound = world.with("blade").without("gripBound");
```

`world.with("blade", "position")` returns entities where both are guaranteed present.
TypeScript narrows the types — no `!`, no guards, no `undefined` checks.

**Why miniplex:**
- Entities are plain objects — Babylon nodes are just property values, no wrappers
- No scheduler opinion — we run systems in Babylon's render loop
- Lifecycle events on queries — `onEntityAdded` / `onEntityRemoved` per query
- Queries are cached and deduplicated by configuration

Source: https://github.com/hmans/miniplex

## MobX + mobx-utils — Reactive Engine

MobX provides the reactive primitives. mobx-utils provides three patterns that
eliminate manual wiring between ECS and Babylon.

### createTransformer — Entity-to-Visual Bridge

The most important pattern. A reactive, memoized function that:
- Maps entity (data) to mesh (visual) — one-to-one
- Caches the result per entity — same entity always returns same mesh
- Re-runs when entity's observable properties change — mesh stays in sync
- Auto-cleans up when entity leaves all reactions — onCleanup disposes mesh

```typescript
const entityToMesh = createTransformer(
  (entity) => {
    const mesh = MeshBuilder.CreateCylinder(entity.name, { ... });
    return mesh;
  },
  (mesh) => mesh.dispose(false, true)  // auto-cleanup
);
```

The memoization table IS the reverse index. No manual tracking of what needs
disposal. The reactive runtime handles creation, updates, and destruction.

### queueProcessor — Event Processing

Observable array acts as an event queue. Processor runs for each item pushed.

```typescript
const collisionEvents = observable([]);
queueProcessor(collisionEvents, (event) => {
  spawnSparks(event.point);
  triggerHaptic(event.hand);
});

// Any system can push events:
collisionEvents.push({ point, hand });
```

Multiple systems push events. Multiple processors consume them. No system knows
about any other. Adding a new reaction (screen shake, sound) means adding a
processor — nothing existing changes.

### fromResource — External Event Bridge

Bridges Babylon observables into MobX reactivity. Auto-subscribes when observed,
auto-unsubscribes when not.

```typescript
const controllerState = fromResource(
  (sink) => {
    input.onControllerAddedObservable.add((source) => sink(source));
  },
  () => { /* unsubscribe when no longer observed */ }
);
```

One thin adapter at the boundary. Everything inside is reactive, not callback-based.

Source: https://github.com/mobxjs/mobx-utils

## Systems — Plain Functions in the Render Loop

Per-frame logic is just functions. No framework, no decorators. One pipeline,
all behavior visible.

```typescript
const pipeline = [
  saberSetupSystem,    // query(Input).without(Blade) → build saber
  gripBindSystem,      // query(Input, Blade).without(GripBound) → poll for grip
  trailUpdateSystem,   // query(Trail, GripBound) → update trail mesh
  collisionSystem,     // query(Blade, GripBound) → check intersections
  cleanupSystem,       // remove destroyed entities
];

scene.onBeforeRenderObservable.add(() => {
  for (const system of pipeline) system(world);
});
```

**State-based detection replaces callbacks.** A new controller isn't an event —
it's an entity with `Input` but without `Blade`. The setup system queries for
this pattern every frame. When it matches, it builds the saber. No event
registration, no nesting, no hidden subscriptions.

**Polling replaces nested observable chains.** Instead of
`onMotionControllerInitObservable.addOnce` nested inside `onControllerAddedObservable`,
a grip-bind system checks `source.grip` each frame. When it appears, bind and mark
with `GripBound`. Simple, visible, no nesting.

# Key Insights

## From Flecs: Entity Relationships

Sander Mertens's article on entity relationships in Flecs revealed patterns
that apply beyond C++:

**Relationships as pairs:** `(AttachedTo, Grip)` is a single component made of
two entities. The ECS owns the relationship. If either entity is destroyed, the
relationship is automatically cleaned up.

**Exclusive relationships:** a saber can only be attached to one grip. Adding a
new target automatically removes the old one — prevents duplicate saber bugs by design.

**Wildcard queries:** `(AttachedTo, *)` finds all attached entities without knowing
the specific target. `(*, Grip)` finds everything attached to a specific grip.
Both directions queryable from the same data structure.

**Graph queries with variables:** chain relationships to traverse entity graphs.
Find all sabers attached to grips belonging to players allied with a faction.
The query engine handles traversal — no bespoke data structures.

Flecs provides these natively in C/C++. In our TypeScript stack, `createTransformer`'s
memoization table provides the reverse index, and miniplex queries provide the
forward lookups. Not as deeply integrated, but the patterns are achievable.

Article: https://ajmmertens.medium.com/building-games-in-ecs-with-entity-relationships-657275ba2c6c
Repository: https://github.com/SanderMertens/flecs

## From MobX: Reactive Memoization

The `createTransformer` pattern solves three problems with one mechanism:
1. **Creation** — entity appears → transformer creates visual
2. **Updates** — entity changes → transformer re-runs → visual updates
3. **Destruction** — entity gone → memoization entry dropped → onCleanup fires

This eliminates the need for separate create/update/destroy code paths that must
be kept in sync manually. The reactive runtime guarantees consistency.

## From Signals/Atoms: Same Core, Different Surface

MobX observables, Preact signals, SolidJS signals, and Angular signals all
implement the same algorithm: dependency tracking via access interception.
Read a reactive value inside a computed/effect → runtime records the dependency.
Value changes → dependents re-run.

MobX pioneered this in JavaScript (2015). Signals reinvented it with leaner APIs.
The concepts are interchangeable — understanding one means understanding all.
We chose MobX for its ecosystem (mobx-utils) not its reactive model.

# What This Architecture Enables

**Adding new behavior without modifying existing code:**
Block spawning, scoring, haptics, particles, audio sync — each is an independent
system that queries entities and processes them. No system imports another.

**Automatic resource lifecycle:**
`createTransformer` + `dispose(false, true)` means: entity exists → mesh exists.
Entity gone → mesh gone. Materials, children, everything. No manual tracking.

**Visible control flow:**
One pipeline array lists every system. One render callback runs them in order.
No hidden subscriptions, no nested callbacks, no "where does this code run?"

**Testable in isolation:**
Systems are pure functions over a world. Create a world, add test entities,
run the system, assert results. No Babylon scene required for logic tests.
NullEngine covers visual tests.

**Serializable state:**
Entities are plain objects. Snapshot the world for save/load, replay, networking,
or debugging. No class instances, no closures, no hidden state.

**Incremental adoption:**
We can migrate one system at a time. Existing Babylon observable code works
alongside ECS systems. `fromResource` bridges the two worlds.

# Pivot Log

**"TypeScript can't do type-safe ECS"** — Wrong. Generics on component definitions
propagate through queries. `world.with("blade", "position")` returns entities
where both properties are non-optional. Miniplex proves this works.

**"Only need miniplex, MobX is unnecessary"** — Overcorrection. Per-frame systems
don't need reactivity, but the entity→visual bridge, event processing, and
external event bridging all benefit from reactive primitives. Two libraries
cover different concerns.

**"MST handles relationship cleanup automatically"** — Overstated. MST's
`safeReference` detects invalidation (returns undefined) but doesn't auto-remove
the reference from the parent entity. Detection is not cleanup.

**"Need 5+ libraries"** — Conflated multiple solutions for the same problem.
Consolidated to miniplex (entities) + MobX/mobx-utils (reactivity). Two libraries,
complementary concerns, zero overlap.

# Unverified — Requires Prototype

Before investing in migration, these assumptions need isolated testing:

1. `createTransformer` with Babylon meshes — does onCleanup fire reliably?
   Does the memoization table handle entity identity correctly?
2. `fromResource` with Babylon observables — does auto-subscribe/unsubscribe
   work with `onControllerAddedObservable`?
3. MobX reactivity inside a 60fps render loop — overhead of observable reads
   in hot systems (trail update, collision check)?
4. Miniplex query performance with hundreds of block entities spawning per second
5. `createTransformer` memoization as reverse index — when entity B is removed,
   do all transformers that referenced B re-evaluate and clean up?

Next step: prototype the saber→grip relationship using miniplex + createTransformer
in an isolated NullEngine test script.
