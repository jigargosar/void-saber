Arena — Koota ECS Spike

Survival top-down shooter. Dark theme. Canvas2D renderer.
Purpose: Incrementally learn Koota features through a small game that grows.

Concept
- Player (bright shape) in a dark arena
- WASD movement, mouse aim, click to shoot
- Enemies spawn at edges, swarm toward player
- Kill enemies, collect XP, level up, gain weapons
- Survive as long as possible

Locked Increments

+-----+==========================+===============================================+
| #   | Game Feature             | Koota Concepts Introduced                     |
+-----+==========================+===============================================+
| 1   | Flying player            | trait (schema), trait (callback), world.spawn, |
|     | WASD movement            | query().updateEach, world trait (Time),        |
|     | dark canvas              | defineQuery                                    |
+-----+--------------------------+-----------------------------------------------+
| 2   | Shoot toward mouse       | trait() tag, entity.destroy(), spawn           |
|     | bullets despawn          | dynamically, lifetime                          |
+-----+--------------------------+-----------------------------------------------+
| 3   | Enemies spawn + chase    | Not() modifier, onQueryAdd / onQueryRemove     |
|     | collision kills them     | (visual lifecycle), createRemoved()            |
+-----+--------------------------+-----------------------------------------------+
| 4   | Damage + health + death  | onChange, Changed() modifier, world traits      |
|     | score + game over        | (HP, Score, GameState), world.onChange()        |
+-----+--------------------------+-----------------------------------------------+
| 5   | XP gems + level-up       | world.onRemove() -> spawn gem, createAdded(),  |
|     | particles on death       | callback trait for particles, select()          |
+-----+--------------------------+-----------------------------------------------+
| 6   | Weapons as entities      | relation() with store, exclusive, autoDestroy,  |
|     | upgrades on level-up     | entity.set(), Or(), useStores()                |
+-----+--------------------------+-----------------------------------------------+

Koota Feature Coverage

+-----+====================================+=============+
| #   | Koota Feature                      | Increment   |
+-----+====================================+=============+
| 1   | trait({ schema })  SoA             | 1           |
+-----+------------------------------------+-------------+
| 2   | trait(() => obj)   AoS callback    | 1           |
+-----+------------------------------------+-------------+
| 3   | trait()            tag             | 2           |
+-----+------------------------------------+-------------+
| 4   | world.spawn()                      | 1           |
+-----+------------------------------------+-------------+
| 5   | entity.destroy()                   | 2           |
+-----+------------------------------------+-------------+
| 6   | world.query().updateEach           | 1           |
+-----+------------------------------------+-------------+
| 7   | defineQuery()      cached          | 1           |
+-----+------------------------------------+-------------+
| 8   | Not()              modifier        | 3           |
+-----+------------------------------------+-------------+
| 9   | Or()               modifier        | 6           |
+-----+------------------------------------+-------------+
| 10  | createAdded()                      | 5           |
+-----+------------------------------------+-------------+
| 11  | createRemoved()                    | 3           |
+-----+------------------------------------+-------------+
| 12  | createChanged()                    | 4           |
+-----+------------------------------------+-------------+
| 13  | world.onAdd()                      | 3           |
+-----+------------------------------------+-------------+
| 14  | world.onRemove()                   | 5           |
+-----+------------------------------------+-------------+
| 15  | world.onChange()                    | 4           |
+-----+------------------------------------+-------------+
| 16  | world.onQueryAdd()                 | 3           |
+-----+------------------------------------+-------------+
| 17  | world.onQueryRemove()              | 3           |
+-----+------------------------------------+-------------+
| 18  | World traits       singletons     | 1           |
+-----+------------------------------------+-------------+
| 19  | entity.set()       change detect   | 6           |
+-----+------------------------------------+-------------+
| 20  | relation()                         | 6           |
+-----+------------------------------------+-------------+
| 21  | relation with store                | 6           |
+-----+------------------------------------+-------------+
| 22  | exclusive relation                 | 6           |
+-----+------------------------------------+-------------+
| 23  | autoDestroy relation               | 6           |
+-----+------------------------------------+-------------+
| 24  | select()           on queries      | 5           |
+-----+------------------------------------+-------------+
| 25  | useStores()        direct SoA      | 6           |
+-----+------------------------------------+-------------+

Tech Stack
- Renderer: Canvas2D (dark background, bright entities)
- ECS: Koota
- Math: planck.js Vec2 (already installed)
- Build: Vite (existing project setup)
- Entry: sandbox-arena.html at project root
- Source: src/sandbox/arena/
