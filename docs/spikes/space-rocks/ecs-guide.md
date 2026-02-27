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
