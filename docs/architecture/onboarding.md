Onboarding: Reactive ECS Stack
See [reactive-ecs.md](reactive-ecs.md) for architecture rationale and design history.

# Stack

- **Miniplex** — entity storage, typed queries, lifecycle events
- **MobX** — reactive primitives (observable, computed, autorun)
- **mobx-utils** — `createTransformer`, `queueProcessor`, `fromResource`
- **Babylon.js** — rendering, scene graph, WebXR

# Quick Patterns

**Entity → Visual bridge** (createTransformer + onCleanup):
```typescript
const toMesh = createTransformer(
  (entity) => { /* create mesh, return root node */ },
  (root) => root.dispose(false, true)  // auto-cleanup
);
```

**Miniplex → MobX bridge** (query events → shallow observable array):
```typescript
const list = observable.array([], { deep: false });
query.onEntityAdded.subscribe(e => runInAction(() => list.push(e)));
query.onEntityRemoved.subscribe(e => runInAction(() => {
  const i = list.indexOf(e); if (i >= 0) list.splice(i, 1);
}));
```

**Event queue** (single-consumer, dispatch to all handlers inside):
```typescript
queueProcessor(events, (e) => { handler1(e); handler2(e); handler3(e); });
```

**External event bridge** (Babylon observable → MobX):
```typescript
fromResource(
  (sink) => { babylonObservable.add((data) => sink(data)); },
  () => { babylonObservable.clear(); }
);
```

# Gotchas

## MobX observable arrays wrap items in proxies

`observable([])` deep-wraps every pushed object. `indexOf(original)` returns -1
because `proxy !== original`.

**Fix:** `observable.array([], { deep: false })`

**Why:** MobX makes every property of every item reactive by default. We don't
need that — miniplex owns entity data, MobX only needs to track array membership.
Shallow mode observes push/splice but leaves items untouched.

Verified: [tests/verify-integration.mjs](tests/verify-integration.mjs) test 4

## dispose() without second arg leaks materials

`mesh.dispose()` or `root.dispose()` removes nodes from scene but leaves
`StandardMaterial` instances in `scene.materials`.

**Fix:** Always `root.dispose(false, true)` — second arg = disposeMaterialAndTextures.

**Why:** Babylon treats materials as shared resources. Multiple meshes can
reference the same material, so disposing a mesh doesn't assume it should
take the material with it. The flag overrides this.

Verified: [tests/verify-babylon.mjs](tests/verify-babylon.mjs) tests 4-5

## LastCreatedScene — implicit global

Babylon constructors without a `scene` arg silently use `EngineStore.LastCreatedScene`.
If two scenes exist, nodes register in whichever was created last, not the one
you'd expect.

**Our decision:** Accept this — single-scene app. See [ADR-001](../adr/001-implicit-scene-assignment.md).

**Risk:** A second scene (debug overlay, minimap) would silently misregister nodes.

Verified: [tests/verify-babylon.mjs](tests/verify-babylon.mjs) test 3

## .parent does NOT transfer scene membership

Setting `child.parent = node` only affects transform hierarchy. The child stays
registered in whatever scene it was constructed with. Parent in scene1, child in
scene2 is a valid (and silent) state.

Verified: [tests/verify-babylon.mjs](tests/verify-babylon.mjs) test 2

## queueProcessor is single-consumer

It removes items from the array after processing. A second `queueProcessor` on
the same array sees nothing.

**Fix:** One processor per event type, all handlers inside it.

**Why:** It's a queue (FIFO, consume-once), not pub/sub (broadcast).

Verified: [tests/verify-mobx.mjs](tests/verify-mobx.mjs) test 9

## createTransformer requires active observation

Transformations only stay alive inside a reactive context (`autorun`, `computed`,
`observer` component). Outside a reaction, results are not cached and cleanup
won't fire.

**Fix:** Always use inside `autorun` or equivalent.

Verified: [tests/verify-mobx.mjs](tests/verify-mobx.mjs) tests 3-4
