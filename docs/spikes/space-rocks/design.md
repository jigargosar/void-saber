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
| 3   | Direct property mutation bypasses    | Entity type uses readonly keys.        |
|     | Miniplex indexing — entity.sprite=x  | entity.sprite = x is a compile error.  |
|     | compiles but breaks queries          | Only world.addComponent can set them   |
+-----+--------------------------------------+----------------------------------------+
| 4   | addComponent inside onEnter triggers  | createLifecycleHook returns components |
|     | re-indexing during notification       | from builder. Framework applies them.  |
|     | cycle — unknown if safe              | Consumer never calls addComponent in   |
|     |                                      | a callback                             |
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

A modified copy of `src/ecs.ts`. All original functions preserved.
Four additions:

### 1. createLifecycleHook

Replaces raw `onEnter` + manual `addComponent` inside callbacks.

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

The `add` helper is fully typed — it calls `world.addComponent`
internally. The consumer never touches `addComponent` in a callback.

Prevents: Issue 2 (circular queries), Issue 4 (re-indexing during
notification).

### 2. Readonly Entity Component Keys

Applied in the game's `types.ts`, not `ecs.ts`:

```typescript
export type Entity = {
  readonly position?: Position;
  readonly velocity?: Velocity;
  readonly sprite?: Sprite;
  // ...
};
```

`entity.sprite = x` is a compile error. `entity.position.x = 5` still
works (component internals remain mutable — systems need to update
positions).

Prevents: Issue 3 (direct mutation bypassing indexing).

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
| 1   | You learn    | onEnter / onExit lifecycle, Teardown,          |
|     |              | createLifecycleHook                            |
+-----+--------------+------------------------------------------------+
| 2   | You build    | Lifecycle hook: when entity enters spawn query, |
|     |              | create DOM sprite via add('sprite', ...).       |
|     |              | When entity exits, remove sprite from DOM.      |
|     |              | Render sync system: positions → CSS transforms  |
+-----+--------------+------------------------------------------------+
| 3   | Study first  | ecs.ts: createLifecycleHook, onEnter, onExit   |
|     |              | Understand why trigger query must NOT include   |
|     |              | components the builder creates (Issue 2)        |
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

1. Trigger queries must NOT include components the lifecycle handler creates
2. Never assign component directly — always `world.addComponent` or lifecycle `add` helper
3. Never call `world.remove` directly — always `safeRemove`
4. Input bridges translate events only — no game queries, no game decisions
5. Game logic never reads render layer (DOM sizes, CSS values, element positions)
6. Every component a system reads must be guaranteed by its query — no runtime guards
7. Component changes take effect next frame — accept one-frame delay
8. Every setup function's teardown must be registered with the collector
