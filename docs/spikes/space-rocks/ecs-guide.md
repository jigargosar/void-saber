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
