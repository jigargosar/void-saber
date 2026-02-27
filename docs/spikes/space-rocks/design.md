ECS Learning Sandbox v2 — "Space Rocks"

## Intent

This sandbox exists to teach one person how the ECS framework works
through building a small game. Every pattern in this codebase must be
correct and idiomatic — pattern trustworthiness matters more than feature
completeness.

This is NOT a game development project. This is a learning tool shaped
like a game.

### What v1 (Guard the Gate) Got Wrong

The first sandbox had no stated learning intent. The AI treated it as a
feature delivery task and optimized for "game works" instead of "patterns
are correct." Result: 13 issues found during review, making the codebase
untrustworthy as a reference. Learning was blocked by debugging.

See: `docs/spikes/ecs-sandbox/ecs-sandbox-report.md` for full findings.

### Rules for This Sandbox

1. Every ECS pattern must be demonstrably correct
2. No pattern used without understanding — if unclear, stop and study
3. Framework fixes applied upfront — the foundation must be solid
4. Phases are small — verify understanding before adding complexity
5. Wrong patterns are worse than missing features


## Guard the Gate Findings — Carried Forward

13 issues categorized by resolution:

### Fixed in Framework (ecs.ts copy)

```
+-----+======================================+========================================+
| #   | Issue                                | Fix Applied                            |
+-----+======================================+========================================+
| 2   | Circular lifecycle query deadlock    | createLifecycleHook separates trigger  |
|     | — sprite required in query, but      | keys from built components. Builder    |
|     | sprite created by the onEnter that   | callback returns components to add;    |
|     | needs the query to fire              | framework calls addComponent after     |
+-----+--------------------------------------+----------------------------------------+
| 3   | Direct property mutation bypasses    | createWorld<E>() wraps entity type in  |
|     | Miniplex indexing — entity.sprite=x  | Readonly<E>. Assignment and deletion   |
|     | compiles but breaks queries          | are compile errors automatically       |
+-----+--------------------------------------+----------------------------------------+
| 4   | addComponent inside onEnter triggers  | Verified safe by reading Miniplex      |
|     | re-indexing during notification       | source — all checks are idempotent.    |
|     | cycle — unknown if safe              | createLifecycleHook uses addComponent  |
|     |                                      | internally via the add helper          |
+-----+--------------------------------------+----------------------------------------+
| 5   | Double-remove on same entity has     | safeRemove wrapper checks world.has()  |
|     | unknown behavior in Miniplex         | before calling world.remove(). No-ops  |
|     |                                      | on already-removed entities            |
+-----+--------------------------------------+----------------------------------------+
| 9   | No teardown orchestration — all      | createTeardownCollector gathers all    |
|     | cleanup functions captured but       | teardowns. Single shutdown() call      |
|     | never called                         | runs them in reverse order (LIFO)      |
+-----+--------------------------------------+----------------------------------------+
```

### Prevented by Convention (rules to follow)

```
+-----+======================================+========================================+
| #   | Issue                                | Convention                             |
+-----+======================================+========================================+
| 6   | Hit radius read from DOM element     | Game logic never reads render layer.   |
|     | size — couples collision to render   | Hit radius comes from data.ts or       |
|     |                                      | entity component, not DOM              |
+-----+--------------------------------------+----------------------------------------+
| 7   | Input bridge contains game logic     | Bridges are pure translators:          |
|     | (decides bullet vs. power-up click)  | external event → ECS entity/event.     |
|     |                                      | Systems decide what events mean        |
+-----+--------------------------------------+----------------------------------------+
| 8   | Accessing component not in query     | If a system reads a component, that    |
|     | with runtime guard hiding type gap   | component must be in the query.        |
|     |                                      | No runtime guards for type gaps        |
+-----+--------------------------------------+----------------------------------------+
| 10  | Freeze mid-frame — system ordering   | Component changes apply next frame     |
|     | causes inconsistent state within     | by convention. Accept one-frame delay  |
|     | a single frame                       | rather than adding command buffers     |
+-----+--------------------------------------+----------------------------------------+
```

### Not Applicable (v1 missing features — different game)

Issues 1 (marker bundling — already fixed), 11 (particle fade), 12
(missing visuals), 13 (no win/lose) — these were code-level gaps in
Guard the Gate, not framework problems. The new game builds these
correctly from the start.


## Framework Changes — `src/sandbox/space-rocks/ecs.ts`

A modified copy of `src/ecs.ts`. Unsafe functions removed, safe
alternatives added.

Removed: `onEnter`, `onExit` (redundant — createLifecycleHook covers
all use cases including side-effect-only reactions).
Removed: `World` as value export (use `createWorld` instead).

### 1. createWorld

```typescript
const world = createWorld<Entity>();  // World<Readonly<Entity>>
```

Wraps Entity in `Readonly<E>` automatically. The Entity type does NOT
need readonly annotations — the world handles it. All component keys
on returned entities are readonly:

- `entity.sprite = x` → compile error (assignment blocked)
- `delete entity.sprite` → compile error (deletion blocked)
- `entity.position.x += 10` → works (shallow — internals mutable)
- `world.addComponent(entity, 'sprite', val)` → works (method call)

Prevents: Issue 3 (direct mutation bypassing Miniplex indexing).

### 2. createLifecycleHook

Subscribe to entity lifecycle events with a typed `add` helper.

```typescript
createLifecycleHook(world, enemySpawns, {
  onEnter: (entity, add) => {
    const el = createSprite(entity);
    add('sprite', { el });
  },
  onExit: (entity) => {
    entity.sprite?.el.remove();
  },
});
```

The `add` helper calls `world.addComponent` internally (verified safe
in callbacks — all Miniplex checks are idempotent). The API shape
naturally separates trigger components from built components, preventing
circular query deadlocks.

Prevents: Issue 2 (circular queries). Issue 4 is resolved — addComponent
in callbacks is verified safe.

### 3. safeRemove

```typescript
safeRemove(world, entity); // no-ops if entity already removed
```

Returns `true` if removal happened, `false` if entity wasn't in world.

Prevents: Issue 5 (double-remove undefined behavior).

### 4. createTeardownCollector

```typescript
const collector = createTeardownCollector();
collector.add(createLifecycleHook(...));
collector.add(createEventQueue(...).dispose);
collector.add(bridgeKeyboard(...));
// ...
collector.shutdown(); // runs all teardowns in reverse order
```

Prevents: Issue 9 (leaked intervals, listeners, reactions).


## Game Concept — Space Rocks

2D top-down arena. A ship in the center, rocks drift in from edges.
Player rotates ship with mouse, thrusts with W, shoots with click.
Rocks break into smaller rocks when hit. Destroyed rocks may drop
power-ups (shield, rapid fire). Score increases with each rock destroyed.
Game ends when ship health reaches zero.

Simple. Universal. Every mechanic maps to an ECS concept.


## Phased Build Plan

Each phase introduces 1-2 new ECS concepts. Verify understanding before
moving to the next phase. The "Study" section tells you what to read in
`ecs.ts` before writing code.

### Phase 1: Entities + Movement

```
+-----+==============+================================================+
| #   | Aspect       | Detail                                         |
+-----+==============+================================================+
| 1   | You learn    | Entity, Component, Query, Polling System,      |
|     |              | Pipeline                                       |
+-----+--------------+------------------------------------------------+
| 2   | You build    | Ship entity with position + velocity. Rock     |
|     |              | entities that drift. Movement system adds       |
|     |              | velocity to position each frame. Pipeline runs  |
|     |              | the system. Console.log positions to verify     |
+-----+--------------+------------------------------------------------+
| 3   | Study first  | ecs.ts: World, Query, System, createPipeline   |
|     |              | Miniplex: world.add(), world.with(),           |
|     |              | query iteration (for...of)                     |
+-----+--------------+------------------------------------------------+
| 4   | Framework    | None — basic Miniplex, no gotchas yet          |
|     | fix relevant |                                                |
+-----+--------------+------------------------------------------------+
| 5   | Files        | types.ts, world.ts, movement-system.ts,        |
|     |              | main.ts (bootstrap + pipeline)                 |
+-----+--------------+------------------------------------------------+
```

### Phase 2: Rendering

```
+-----+==============+================================================+
| #   | Aspect       | Detail                                         |
+-----+==============+================================================+
| 1   | You learn    | Entity lifecycle (onEntityAdded /               |
|     |              | onEntityRemoved), Teardown, createLifecycleHook |
+-----+--------------+------------------------------------------------+
| 2   | You build    | Lifecycle hook: when entity enters spawn query, |
|     |              | create DOM sprite via add('sprite', ...).       |
|     |              | When entity exits, remove sprite from DOM.      |
|     |              | Render sync system: positions → CSS transforms  |
+-----+--------------+------------------------------------------------+
| 3   | Study first  | ecs.ts: createLifecycleHook                    |
|     |              | Understand why trigger query must NOT include   |
|     |              | components the builder creates (Gotcha 1)       |
+-----+--------------+------------------------------------------------+
| 4   | Framework    | createLifecycleHook — this is where it matters |
|     | fix relevant | (prevents Issue 2 + 4)                         |
+-----+--------------+------------------------------------------------+
| 5   | Files        | render-pipeline.ts                             |
+-----+--------------+------------------------------------------------+
```

### Phase 3: Input

```
+-----+==============+================================================+
| #   | Aspect       | Detail                                         |
+-----+==============+================================================+
| 1   | You learn    | External Event Bridging (browser → ECS)        |
+-----+--------------+------------------------------------------------+
| 2   | You build    | Keyboard bridge: keydown/keyup → update ship   |
|     |              | thrust/rotation state. Mouse bridge: mousemove  |
|     |              | → update aim. click → create "shoot" event.    |
|     |              | Bridges are PURE translators — no game logic   |
+-----+--------------+------------------------------------------------+
| 3   | Study first  | Convention: bridges translate events, systems   |
|     |              | decide meaning. Re-read Issue 7 from report    |
+-----+--------------+------------------------------------------------+
| 4   | Framework    | Convention only (Issue 7) — no code fix, just  |
|     | fix relevant | discipline                                     |
+-----+--------------+------------------------------------------------+
| 5   | Files        | input-bridge.ts                                |
+-----+--------------+------------------------------------------------+
```

### Phase 4: Shooting + Collision

```
+-----+==============+================================================+
| #   | Aspect       | Detail                                         |
+-----+==============+================================================+
| 1   | You learn    | Event Queues + Handlers, Stateless Detection,  |
|     |              | entity removal                                 |
+-----+--------------+------------------------------------------------+
| 2   | You build    | Bullet entities with lifetime. Collision system |
|     |              | detects bullet-vs-rock (distance check), pushes |
|     |              | DamageEvent to queue. Handler: reduce rock     |
|     |              | health, safeRemove dead rocks, split into      |
|     |              | smaller rocks. Lifetime system removes expired  |
|     |              | bullets                                        |
+-----+--------------+------------------------------------------------+
| 3   | Study first  | ecs.ts: createEventQueue (push, flush, dispose) |
|     |              | Pipeline: systems run first, queues flush after |
|     |              | Understand Issue 5 (double-remove) and why     |
|     |              | safeRemove exists                              |
+-----+--------------+------------------------------------------------+
| 4   | Framework    | safeRemove — prevents double-remove (Issue 5)  |
|     | fix relevant |                                                |
+-----+--------------+------------------------------------------------+
| 5   | Files        | bullet-system.ts, collision-system.ts,         |
|     |              | lifetime-system.ts, events.ts                  |
+-----+--------------+------------------------------------------------+
```

### Phase 5: Power-ups + Polish

```
+-----+==============+================================================+
| #   | Aspect       | Detail                                         |
+-----+==============+================================================+
| 1   | You learn    | Stateful Interactions (component add/remove as |
|     |              | state), Non-ECS Data Lookups, Reactive State   |
+-----+--------------+------------------------------------------------+
| 2   | You build    | Power-up drops from destroyed rocks. Collecting |
|     |              | adds shielded/rapidFire component to ship.     |
|     |              | Thaw/expire system removes after timer.        |
|     |              | Score via MobX state. Particles. Game over     |
+-----+--------------+------------------------------------------------+
| 3   | Study first  | ecs.ts: state(), reactTo() (MobX wrappers)     |
|     |              | data.ts: static lookup tables                  |
|     |              | Convention: component presence = state flag     |
+-----+--------------+------------------------------------------------+
| 4   | Framework    | createTeardownCollector — full cleanup          |
|     | fix relevant | readonly Entity keys — mutation guard (Issue 3) |
|     |              | (present from Phase 1, but tested here with    |
|     |              | stateful component add/remove)                 |
+-----+--------------+------------------------------------------------+
| 5   | Files        | data.ts, power-up-system.ts, score.ts,         |
|     |              | particle-system.ts                             |
+-----+--------------+------------------------------------------------+
```


## Prevention Rules

Distilled from Guard the Gate. Violations of these rules produce silent
bugs — no errors, no warnings, just wrong behavior.

### Entity Mutation Rules

These two rules govern ALL entity interaction. Everything else follows
from them.

**Rule A — Component SLOTS are immutable (managed by Miniplex)**
Adding, replacing, or removing a component slot must go through
`world.addComponent` / `world.removeComponent` / `safeRemove`.
Direct assignment (`entity.sprite = x`) and deletion
(`delete entity.sprite`) bypass Miniplex indexing — queries go stale,
lifecycle hooks don't fire. Silent corruption.

Enforced by: `createWorld<E>()` wraps the entity type in `Readonly<E>`.
Both assignment and deletion are compile errors. No manual `readonly`
annotations needed on the Entity type.

**Rule B — Component VALUES are mutable (owned by systems)**
Changing values inside an existing component (`entity.position.x += 10`)
is safe and expected. Miniplex indexes on component *presence*, not
component *values*. Systems need this to function.

### Miniplex Gotchas

Verified by reading Miniplex, Bucket, and eventery source code.

**Gotcha 1 — Circular query deadlock**
If a query requires component X, and the `onEntityAdded` callback for
that query is responsible for creating X, the callback never fires.
The entity needs X to enter the query, but X is only created by the
callback that requires the entity to already be in the query.
No error, no warning. Silent deadlock.

Fix: the trigger query must only include components that exist at
entity creation time. The callback adds the rest.

**Gotcha 2 — `world.remove` inside callbacks**
Calling `world.remove(entity)` inside an `onEntityAdded` callback for
that same entity causes state corruption. The entity is removed from
the world, but the outer reindex loop continues and re-adds the entity
to queries — leaving an entity in queries but not in the world.

Same applies to `onEntityRemoved` — double Bucket.remove corrupts the
internal array (shuffle-pop on an already-removed entity).

Fix: never remove an entity inside its own lifecycle callback. Push a
removal event to a queue. The queue flushes after all systems, outside
any callback.

**What IS safe inside callbacks:**

```
+-----+=========================+============+
| #   | Operation               | Safe?      |
+-----+=========================+============+
| 1   | world.addComponent      | YES        |
+-----+-------------------------+------------+
| 2   | world.removeComponent   | YES        |
+-----+-------------------------+------------+
| 3   | world.add (new entity)  | YES        |
+-----+-------------------------+------------+
| 4   | world.remove (same      | NO         |
|     | entity being processed) |            |
+-----+-------------------------+------------+
```

### Prevention Rules

1. Never assign a component directly — always `world.addComponent` or lifecycle `add` helper
2. Never `delete` a component — always `world.removeComponent`
3. Never call `world.remove` directly — always `safeRemove`
4. Never call `world.remove` inside a lifecycle callback for the entity being processed
5. Input bridges translate events only — no game queries, no game decisions
6. Game logic never reads render layer (DOM sizes, CSS values, element positions)
7. Every component a system reads must be guaranteed by its query — no runtime guards
8. Component changes take effect next frame — accept one-frame delay
9. Every setup function's teardown must be registered with the collector
