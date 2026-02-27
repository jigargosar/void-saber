ECS Learning Sandbox — "Guard the Gate"

## Requirement

A minimal 2D game built with the same ECS framework (`src/ecs.ts` — Miniplex + MobX utilities) to serve as a learning sandbox.

- Covers the full breadth of ECS concepts: entities, components, queries, polling systems, event-driven systems, event queues/handlers, stateful interactions, stateless detection, external event bridging, teardowns, and non-ECS data lookups
- Each concept appears in at least 3 distinct usages so the pattern is unambiguous
- Purpose is understanding, not production. Minimal depth, maximum concept coverage
- Not 3D — simple 2D

## Game Concept

"Guard the Gate" — a 2D top-down game where enemies spawn at the top and walk toward a gate at the bottom. The player controls a turret that rotates and shoots bullets via mouse aim + click. Dead enemies drop power-ups. Power-ups apply effects like freeze, shield, or heal.

## Concept-to-Mechanic Mapping

```
+-----+=============================+============================================+
| #   | ECS Concept                 | Game Mechanic                              |
+-----+=============================+============================================+
|     |                             |                                            |
|  1  | ENTITIES                    |                                            |
|     |                             |                                            |
|     |  1.1                        | Enemy — spawns at top, walks down          |
|     |  1.2                        | Bullet — fired by turret, flies up         |
|     |  1.3                        | Power-up — drops from dead enemy           |
|     |  1.4                        | Turret — player-controlled, aims at mouse  |
|     |  1.5                        | Particle — visual effect, short-lived      |
|     |                             |                                            |
+-----+-----------------------------+--------------------------------------------+
|     |                             |                                            |
|  2  | COMPONENTS                  |                                            |
|     |                             |                                            |
|     |  2.1                        | position — x,y coords (enemies, bullets,   |
|     |                             | power-ups, particles)                      |
|     |  2.2                        | velocity — dx,dy per frame (enemies,       |
|     |                             | bullets, particles)                        |
|     |  2.3                        | health — current/max (enemies, turret)     |
|     |  2.4                        | hovered — true, added/removed by mouse     |
|     |                             | proximity (power-ups, enemies for tooltip) |
|     |  2.5                        | frozen — true, temporary debuff (enemies)  |
|     |  2.6                        | shielded — true, absorbs one hit (turret)  |
|     |  2.7                        | damage — number, on bullets                |
|     |  2.8                        | enemyType — key into non-ECS lookup        |
|     |  2.9                        | powerUpType — key into non-ECS lookup      |
|     |  2.10                       | sprite — DOM element or canvas ref         |
|     |  2.11                       | lifetime — seconds remaining (particles)   |
|     |                             |                                            |
+-----+-----------------------------+--------------------------------------------+
|     |                             |                                            |
|  3  | QUERIES                     |                                            |
|     |                             |                                            |
|     |  3.1                        | world.with('position', 'velocity')         |
|     |                             | — all moving things (movement system)      |
|     |  3.2                        | world.with('enemy', 'health')              |
|     |                             | — living enemies (collision target)        |
|     |  3.3                        | world.with('powerUp', 'hovered')           |
|     |                             | — highlighted power-ups (selection system) |
|     |  3.4                        | world.with('enemy', 'frozen')              |
|     |                             | — frozen enemies (thaw system)             |
|     |  3.5                        | world.with('particle', 'lifetime')         |
|     |                             | — decaying particles (lifetime system)     |
|     |  3.6                        | world.with('enemy', 'position')            |
|     |                             |   .without('frozen')                       |
|     |                             | — enemies that can move                    |
|     |                             |                                            |
+-----+-----------------------------+--------------------------------------------+
|     |                             |                                            |
|  4  | POLLING SYSTEMS             |                                            |
|     | (per-frame)                 |                                            |
|     |                             |                                            |
|     |  4.1                        | Movement — adds velocity to position       |
|     |                             | for all moving entities                    |
|     |  4.2                        | Bullet-vs-enemy collision — distance       |
|     |                             | check, pushes damage event                 |
|     |  4.3                        | Enemy-vs-gate collision — enemy reached    |
|     |                             | bottom, pushes breach event                |
|     |  4.4                        | Hover detection — mouse proximity to       |
|     |                             | power-ups, adds/removes hovered            |
|     |  4.5                        | Lifetime decay — decrements particle       |
|     |                             | lifetime, removes entity when expired      |
|     |  4.6                        | Thaw system — decrements freeze timer,     |
|     |                             | removes frozen component when done         |
|     |                             |                                            |
+-----+-----------------------------+--------------------------------------------+
|     |                             |                                            |
|  5  | EVENT-DRIVEN SYSTEMS        |                                            |
|     | (onEnter / onExit)          |                                            |
|     |                             |                                            |
|     |  5.1                        | onEnter(enemies) — create sprite/visual    |
|     |  5.2                        | onExit(enemies) — remove sprite, maybe     |
|     |                             | spawn power-up entity                      |
|     |  5.3                        | onEnter(bullets) — create bullet visual    |
|     |  5.4                        | onExit(bullets) — remove bullet visual     |
|     |  5.5                        | onEnter(hoveredPowerUps) — add highlight   |
|     |  5.6                        | onExit(hoveredPowerUps) — remove highlight |
|     |  5.7                        | onEnter(frozenEnemies) — tint sprite blue  |
|     |  5.8                        | onExit(frozenEnemies) — restore sprite     |
|     |                             |                                            |
+-----+-----------------------------+--------------------------------------------+
|     |                             |                                            |
|  6  | EVENT QUEUES + HANDLERS     |                                            |
|     |                             |                                            |
|     |  6.1                        | Damage queue — bullet hits enemy →         |
|     |                             | handler: reduce health, flash sprite,      |
|     |                             | remove bullet                              |
|     |  6.2                        | Breach queue — enemy hits gate →           |
|     |                             | handler: reduce score, screen shake,       |
|     |                             | remove enemy                               |
|     |  6.3                        | Collect queue — power-up selected →        |
|     |                             | handler: apply effect (freeze/shield/heal),|
|     |                             | remove power-up entity                     |
|     |                             |                                            |
+-----+-----------------------------+--------------------------------------------+
|     |                             |                                            |
|  7  | STATEFUL INTERACTIONS       |                                            |
|     | (component added/removed    |                                            |
|     |  across frames)             |                                            |
|     |                             |                                            |
|     |  7.1                        | hovered on power-ups — added when mouse    |
|     |                             | near, removed when mouse moves away        |
|     |  7.2                        | frozen on enemies — added by freeze        |
|     |                             | power-up, removed after timer expires      |
|     |  7.3                        | shielded on turret — added by shield       |
|     |                             | power-up, removed after absorbing a hit    |
|     |                             |                                            |
+-----+-----------------------------+--------------------------------------------+
|     |                             |                                            |
|  8  | STATELESS DETECTION         |                                            |
|     | (fire-and-forget, no        |                                            |
|     |  component change)          |                                            |
|     |                             |                                            |
|     |  8.1                        | Bullet-vs-enemy — push damage event,       |
|     |                             | no collision component stored              |
|     |  8.2                        | Enemy-vs-gate — push breach event,         |
|     |                             | no component stored                        |
|     |  8.3                        | Bullet offscreen — just remove entity,     |
|     |                             | no event needed                            |
|     |                             |                                            |
+-----+-----------------------------+--------------------------------------------+
|     |                             |                                            |
|  9  | EXTERNAL EVENT BRIDGING     |                                            |
|     | (browser → ECS)             |                                            |
|     |                             |                                            |
|     |  9.1                        | Mouse move → update turret aim angle       |
|     |  9.2                        | Mouse click → spawn bullet entity          |
|     |  9.3                        | setInterval → spawn enemy wave             |
|     |                             |                                            |
+-----+-----------------------------+--------------------------------------------+
|     |                             |                                            |
| 10  | TEARDOWNS                   |                                            |
|     |                             |                                            |
|     | 10.1                        | Enemy visual cleanup (onExit)              |
|     | 10.2                        | Bullet visual cleanup (onExit)             |
|     | 10.3                        | Power-up visual cleanup (onExit)           |
|     | 10.4                        | Wave spawner — clearInterval               |
|     | 10.5                        | Mouse listeners — removeEventListener      |
|     | 10.6                        | Event queue dispose — clear buffers        |
|     |                             |                                            |
+-----+-----------------------------+--------------------------------------------+
|     |                             |                                            |
| 11  | NON-ECS DATA LOOKUPS        |                                            |
|     |                             |                                            |
|     | 11.1                        | Enemy types — Map<EnemyTypeId, {speed,     |
|     |                             | health, color}> read at spawn time         |
|     | 11.2                        | Power-up types — Map<PowerUpTypeId,        |
|     |                             | {effect, duration, color}> read on collect |
|     | 11.3                        | Wave definitions — array of {count, delay, |
|     |                             | enemyType} read by wave spawner            |
|     |                             |                                            |
+-----+-----------------------------+--------------------------------------------+
```
