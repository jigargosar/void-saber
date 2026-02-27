ECS Guide — Space Rocks Sandbox


## Entity Typing

Miniplex queries match on component *presence*, not values. This has
a direct consequence for how entity types are modeled.

Tags answer "is this an X?" — use boolean markers:

```typescript
enemy?: true;
bullet?: true;
```

Data answers "what kind?" — use separate components:

```typescript
enemyType?: EnemyTypeId;
```

Never bundle tag + data into one component:

```
BAD:   enemy?: { typeId: string }    — query matches on presence of
                                       enemy, typeId is invisible to
                                       queries and trapped inside

GOOD:  enemy?: true                  — tag for query matching
       enemyType?: EnemyTypeId       — data as its own component
```

Source: Guard the Gate Issue 1.


## Gotchas

### Circular Query Deadlock

If a query requires component X, and the `onEntityAdded` callback for
that query creates X, the callback never fires. Silent deadlock.

```typescript
// BAD — deadlock: query requires 'sprite', callback creates 'sprite'
const enemies = world.with('enemy', 'position', 'sprite');
enemies.onEntityAdded.subscribe((entity) => {
  world.addComponent(entity, 'sprite', { el: createDiv() });
});
world.add({ enemy: true, position: { x: 0, y: 0 } });
// entity never enters query → callback never fires → sprite never added
```

```typescript
// GOOD — trigger query has only components present at creation time
const enemySpawns = world.with('enemy', 'position');
enemySpawns.onEntityAdded.subscribe((entity) => {
  world.addComponent(entity, 'sprite', { el: createDiv() });
});
world.add({ enemy: true, position: { x: 0, y: 0 } });
// entity enters query → callback fires → sprite added
```

Rule: the trigger query must only include components that exist at
entity creation time. The callback adds the rest via
`world.addComponent` (verified safe inside callbacks).

Source: Guard the Gate Issue 2.


### Double-Remove Is Safe

Calling `world.remove(entity)` on an already-removed entity is a
no-op. Miniplex's `Bucket.remove` checks `has(entity)` before acting.
No corruption, no errors, no wrapper needed.

Verified by testing: removed same entity 3 times in sequence — world
size, query membership, and lifecycle events all remained correct.
Only the first remove fires `onEntityRemoved`.

Source: Guard the Gate Issue 5.


### Mid-Frame Component Changes

Systems run in sequence. When system A adds or removes a component,
system B (later in the pipeline) sees the change immediately — in the
same frame. But system A's own earlier iterations already ran without
it.

```
Frame N pipeline: [Movement] → [Freeze] → [Collision]

Movement runs: iterates all unfrozen enemies, moves them.
Freeze runs:   adds 'frozen' to enemy #3.
Collision runs: sees enemy #3 as frozen (correct).

But Movement already moved enemy #3 this frame (incorrect —
it should have been frozen before moving).
```

This is inherent to sequential polling systems — not a bug. There are
two ways to handle it:

1. Command buffer — queue all component changes, apply between frames.
   Every system sees the same snapshot. Heavy framework change.
2. Accept one-frame delay — freeze takes effect next frame. Simple.

Convention: option 2. One-frame delay is acceptable. Don't add command
buffers for this scale of project.

Source: Guard the Gate Issue 10.
