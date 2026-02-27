ECS Sandbox Implementation Report

## Purpose

Build a 2D "Guard the Gate" game using the same ECS framework (`src/ecs.ts`)
as the main VR game, exercising every ECS concept with 3+ distinct usages.
The goal was to learn the system — not ship a game.

## What Was Implemented

15 files in `src/sandbox/guard-the-gate/` + `sandbox.html` entry point.

```
+-----+==============================================+==============+
| #   | File                                         | Role         |
+-----+==============================================+==============+
| 1   | types.ts                                     | Entity type  |
| 2   | world.ts                                     | World +      |
|     |                                              | queries      |
| 3   | data.ts                                      | Non-ECS      |
|     |                                              | lookups      |
| 4   | events.ts                                    | Event types  |
| 5   | movement-system.ts                           | Polling      |
| 6   | bullet-collision-system.ts                   | Polling      |
| 7   | gate-collision-system.ts                     | Polling      |
| 8   | hover-system.ts                              | Polling      |
| 9   | lifetime-system.ts                           | Polling      |
| 10  | thaw-system.ts                               | Polling      |
| 11  | render-pipeline.ts                           | Event-driven |
|     |                                              | + polling    |
| 12  | input-bridge.ts                              | External     |
|     |                                              | bridge       |
| 13  | wave-spawner.ts                              | External     |
|     |                                              | bridge       |
| 14  | main.ts                                      | Bootstrap    |
| 15  | sandbox.html                                 | Entry point  |
+-----+----------------------------------------------+--------------+
```

ECS concepts covered: entities, components, queries, polling systems,
event-driven systems (onEnter/onExit), event queues + handlers,
stateful interactions, stateless detection, external event bridging,
teardowns, non-ECS data lookups, reactive state (MobX).


## Issues Encountered During Implementation

### ISSUE 1: Marker Interfaces Bundled Tag + Data

Initial design used interfaces like `EnemyMarker { typeId: string }` as
components. This is un-idiomatic for Miniplex which treats component
presence as the query mechanism, not component values.

Workaround applied: Replaced with boolean tags (`enemy?: true`) and
separate data components (`enemyType?: EnemyTypeId`). Clean fix, no
residual debt.

Status: FIXED.


### ISSUE 2: Lifecycle Query Circular Deadlock

The lifecycle queries required `sprite`:
```typescript
export const enemies = world.with('enemy', 'position', 'health', 'sprite');
```

But `sprite` is created by the `onEnter(enemies)` handler. No entity can
ever enter this query — the handler that adds sprite never fires because
sprite is required to trigger it. Silent deadlock. No error, no warning.

Workaround applied: Created separate "spawn" queries without sprite:
```typescript
export const enemySpawns = world.with('enemy', 'position', 'health');
```
Used `world.addComponent` in the handler instead of direct property mutation.

Status: FIXED, but the fix is tribal knowledge. Nothing prevents a
developer from recreating the circular pattern. The framework allows it
silently.


### ISSUE 3: Direct Property Mutation Bypasses Indexing

Miniplex requires `world.addComponent(entity, 'sprite', value)` to
properly index the entity into queries. But TypeScript allows:
```typescript
entity.sprite = { el: someDiv };  // compiles, silently breaks queries
```

The initial `attachSprite` helper did exactly this. Fixed to use
`world.addComponent`, but nothing prevents future developers from
making the same mistake.

Status: FIXED in code, NOT prevented by types.


### ISSUE 4: addComponent Inside onEnter Callback

The render pipeline calls `world.addComponent(entity, 'sprite', ...)` inside
an `onEnter` callback. This triggers Miniplex re-indexing while it's
already processing an entity event. Whether this is safe depends on
Miniplex internals — no documentation confirms or denies it.

The entity enters the spawn query, the handler fires and adds sprite,
which may cause the entity to enter other queries (like `renderables`)
during the same notification cycle.

Status: WORKS ACCIDENTALLY. Not verified to be safe.


### ISSUE 5: Double-Remove Undefined Behavior

Two bullets can hit the same enemy in one frame. The bullet collision
system has a `break` to prevent one bullet hitting multiple enemies, but
two bullets can independently detect the same enemy. The damage handler
removes the enemy on first hit. The second handler calls `world.remove`
on an already-removed entity.

A guard exists (`health.current <= 0` check) that prevents double
score/particle/powerup, but the second bullet entity is still removed
via `world.remove(event.source)` — which is fine. The real risk is the
second `world.remove(event.target)` if the guard fails for any reason.

Status: PARTIALLY GUARDED. `world.remove` on removed entity has
unknown behavior in Miniplex.


### ISSUE 6: Hit Radius Couples Render to Game Logic

Bullet collision system reads the enemy's DOM element size for hit radius:
```typescript
const hitRadius = BULLET_RADIUS + (enemy.sprite?.el.clientWidth ?? 20) / 2;
```

This couples collision detection to the rendering layer. The hit radius
should come from `data.ts` (`ENEMY_TYPES[typeId].size`) not from the DOM.

Status: BUG. Wrong data source.


### ISSUE 7: Input Bridge Contains Game Logic

The input bridge decides whether a click spawns a bullet or collects a
power-up by querying `hoveredPowerUps.size`. This puts game decision logic
inside what should be a pure event translator.

The bridge should translate mouse clicks into ECS events or entities.
A separate system should decide what a click means based on game state.

Status: ARCHITECTURAL DEBT. Works but wrong separation of concerns.


### ISSUE 8: Turret Render Accesses Unguaranteed Component

The turret render system iterates `turrets` query (which guarantees
`turret`, `aimAngle`, `position`) but accesses `entity.sprite` which is
not part of the query. Uses a runtime `if (!turret.sprite) continue`
guard.

Works because the turret entity is created with sprite upfront in
`main.ts`. But the type system doesn't enforce this — a future change
could create a turret without sprite and the guard would silently skip
rendering.

Status: FRAGILE. Runtime guard hides type gap.


### ISSUE 9: No Shutdown / Teardown Orchestration

All teardown functions are captured with `void teardownX` — acknowledged
but never called. No shutdown system exists. setInterval in wave spawner,
event listeners in input bridge, and MobX reactions in score all leak
if the game restarts without a full page reload.

Status: MISSING FEATURE.


### ISSUE 10: Frozen Mid-Frame Movement

When the freeze power-up adds `frozen` to enemies, the movement system
may have already moved some of those enemies earlier in the same frame
(if they were iterated before `frozen` was added). The
`activeMovables.without('frozen')` query is correct for subsequent frames,
but the current frame has inconsistent behavior.

This is inherent to polling systems that run in sequence — system ordering
matters, and mid-frame component changes affect later systems but not
earlier ones.

Status: INHERENT ECS LIMITATION. Acceptable if understood.


### ISSUE 11: Particles Don't Fade

Particle sprites are created with `opacity: 0.8` but never updated based
on remaining lifetime. They pop in at 0.8 and disappear instantly when
lifetime expires. Should interpolate opacity from 1.0 → 0.0 as
`lifetime / maxLifetime` decreases.

Status: MISSING FEATURE.


### ISSUE 12: Missing Visual Feedback

- Turret health: component exists, nothing renders it
- Shield effect: `shielded` component added, no visual
- Score changes: text updates but no animation

Status: MISSING FEATURES.


### ISSUE 13: No Win/Lose Condition

Wave spawner loops forever. No game over when turret health reaches zero.
No victory after all waves complete.

Status: MISSING FEATURE.


## Analysis: How Each Issue Can Be Fixed

### Category A: TypeScript Compile-Time Prevention

These can be made impossible through the type system.

ISSUE 2 (Circular lifecycle queries):
Create a `createLifecycleHook` function that takes trigger component keys
and a builder callback returning components to add. The framework builds
the query from trigger keys only. The builder's return type is structurally
separate from trigger keys. The consumer never builds lifecycle queries
manually — the API makes the circular pattern impossible.

```
createLifecycleHook(
  trigger: ['enemy', 'position', 'health'],  // query built from these
  onEnter: (entity) => ({ sprite: ... }),     // these get addComponent'd
  onExit: (entity) => { cleanup },
)
```

ISSUE 3 (Direct property mutation):
Make Entity component keys `readonly` at the type level:
```
type Entity = {
  readonly enemy?: true;
  readonly sprite?: Sprite;
  ...
}
```
`entity.sprite = x` becomes a compile error. Only `world.addComponent`
(which internally casts) can set components. Value mutation
(`entity.position.x = 5`) still works because Position's fields remain
mutable.

ISSUE 8 (Unguaranteed component access):
Add `sprite` to the turret query so TypeScript guarantees it. The turret
entity is created with sprite, so it will match. Alternatively, create a
turretRenderables query that includes sprite. The type system then proves
sprite exists — no runtime guard needed.


### Category B: Framework API Design

These require the `ecs.ts` facade to grow from thin re-exports to an
opinionated API.

ISSUE 4 (addComponent inside onEnter):
The lifecycle hook from Category A eliminates this. The builder callback
returns components, and the framework calls addComponent after the
onEnter notification completes (or batches the additions). The consumer
never calls addComponent inside a callback.

ISSUE 5 (Double-remove):
Wrap `world.remove` with a safe version that checks membership first.
Options:
  1. No-op if entity not in world (silent, forgiving)
  2. Throw if entity not in world (strict, fail-fast)
  3. Return boolean indicating success (informative)

Recommendation: Option 1 for remove (idempotent), option 2 for add
(duplicates indicate a bug).

ISSUE 9 (No shutdown):
The framework should collect teardowns automatically. Every setup function
(createLifecycleHook, createEventQueue, external bridges) registers its
teardown with a central registry. A single `shutdown()` call runs them
all in reverse order.

Bootstrap pattern:
```
const game = createGame();
game.register(createLifecycleHook(...));
game.register(createWaveSpawner());
game.register(bridgeInput(...));
// ...
game.shutdown(); // calls all teardowns in reverse
```


### Category C: Immutable Data / Encapsulation

These require rethinking how data flows.

ISSUE 6 (Hit radius from DOM):
The collision system should never touch the render layer. Hit radius
belongs on the entity as a component (`hitRadius?: number`) or derived
from the non-ECS data lookup (`ENEMY_TYPES[typeId].size / 2`). The
render pipeline reads the same data for visual size. Both derive from
the single source of truth in `data.ts`.

ISSUE 7 (Input bridge game logic):
The bridge should only translate external events into ECS actions:
  - mousemove → update mouse position entity/state
  - click → create a "click" event or entity

A separate system decides what the click means: if a power-up is near
the click position, push CollectEvent. Otherwise, push ShootEvent.
The bridge doesn't import game queries — it only knows about the world
and raw input.

ISSUE 10 (Frozen mid-frame):
Two approaches:
  1. Command buffer: component additions are queued during the frame and
     applied between frames. All systems see the same snapshot.
     Heavy change to the framework.
  2. System ordering discipline: document that freeze effects apply next
     frame, not current frame. Accept the one-frame delay as convention.

Recommendation: Option 2. Command buffers add complexity that isn't
justified for this project's scale.


### Category D: Missing Features (Code, Not Architecture)

These are straightforward implementations, not design issues.

ISSUE 11 (Particle fade):
Store `maxLifetime` on the entity (or compute from initial value).
The render sync reads `lifetime / maxLifetime` and sets opacity.

ISSUE 12 (Missing visuals):
- Health bar: DOM element positioned above turret, width = current/max
- Shield: CSS filter/glow on turret sprite when shielded component present
- Score animation: CSS transition on score element

ISSUE 13 (Win/lose):
- Lose: system checks turret health <= 0, stops pipeline, shows overlay
- Win: wave spawner tracks completion, triggers victory state


## Priority Order for Fixes

```
+-----+======+=========================================+================+
| #   | Cat  | Fix                                     | Impact         |
+-----+======+=========================================+================+
| 1   | B    | Safe remove wrapper                     | Prevents crash |
+-----+------+-----------------------------------------+----------------+
| 2   | C    | Hit radius from data, not DOM           | Fixes bug      |
+-----+------+-----------------------------------------+----------------+
| 3   | A+B  | Lifecycle hook (circular query +        | Prevents 2     |
|     |      | addComponent inside callback)           | silent bugs    |
+-----+------+-----------------------------------------+----------------+
| 4   | A    | Readonly Entity component keys          | Prevents       |
|     |      |                                         | silent bug     |
+-----+------+-----------------------------------------+----------------+
| 5   | C    | Input bridge → pure translator          | Architecture   |
+-----+------+-----------------------------------------+----------------+
| 6   | A    | Turret query includes sprite            | Removes hack   |
+-----+------+-----------------------------------------+----------------+
| 7   | B    | Teardown registry / shutdown            | Prevents leaks |
+-----+------+-----------------------------------------+----------------+
| 8   | D    | Particle fade, visuals, win/lose        | Missing        |
|     |      |                                         | features       |
+-----+------+-----------------------------------------+----------------+
```


## Key Takeaway

The ECS framework (`src/ecs.ts`) is a thin pass-through over Miniplex.
It adds no guardrails. Every bug in this sandbox was caused by Miniplex
allowing incorrect usage silently. The framework needs to grow from
"re-export" to "opinionated facade" that:

1. Makes circular lifecycle queries structurally impossible (TypeScript)
2. Makes direct component mutation a compile error (readonly + addComponent)
3. Makes double-remove safe (idempotent wrapper)
4. Makes teardown automatic (registry pattern)
5. Keeps the bridge layer pure (no game logic in translators)

The pit of success must be wider than the pit of failure.
