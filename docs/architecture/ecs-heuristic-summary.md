ECS Migration — Heuristic Summary

Derived from conversation dump analysis. Line references point to `docs/conversation-dump/ecs-conversation-summary.md`.

# Decisions Made

1. **ECS chosen for Beat Saber architecture** [L1-9] — entities are sabers, blocks, trails, particles, scoring. One-time events = entity creation/destruction. Per-frame behavior = systems iterating components.

2. **Final library stack: 2 libraries** [L2857-2863] — Miniplex (entity storage, typed queries, with/without) + MobX/mobx-utils (observables, computed, reactions, createTransformer). Zero custom infrastructure needed for relationships or cleanup.

3. **Event handling: approach 1 + 2** [L952-962] — State-based detection for everything possible. Event components (one-frame entities) only for fire-and-forget (collision hits, score popups). Skip typed channels (Bevy-style) — overkill at this scale.

4. **createTransformer is THE entity-to-visual bridge** [L2806-2827] — Memoized reactive mapping: entity in → mesh out. Observable changes → re-computation. Entity removed → `onCleanup` fires → mesh disposed. The memoization table itself IS the reverse index.

5. **Three mobx-utils patterns mapped to architecture** [L2806-2863]:
   - `createTransformer`: entity → mesh bridge with auto-cleanup
   - `queueProcessor`: event component processing from observable arrays
   - `fromResource`: Babylon Observable → MobX observable bridge

6. **Custom relationship layer needed** [L1824-1853] — Miniplex for storage/queries, MobX for reactive primitives, custom reverse index (~20 lines) for relationship auto-cleanup on top. Small custom code on proven foundations.

# Rejected Alternatives / Pivots

1. **"TypeScript can't do ECS"** — Wrong. `@skyboxgg/bjs-ecs` proved generics solve query typing [L244-298]
2. **"Only need miniplex, MobX unnecessary"** — Overcorrection. Game needs reactive bridges for multi-system triggers, cleanup cascading, data-to-visual [L1719-1773]
3. **"MST handles relationship cleanup"** — Overstated. `safeReference` detects invalidation but does NOT auto-remove dangling references [L1783-1820]
4. **"Need 5+ libraries"** — Consolidated to 2 [L2857-2863]
5. **Signals/atoms** — Same dependency-tracking algorithm as MobX, different API. Redundant since already invested in MobX [L2867-2963]

# Problems Identified

1. **MobX proxy identity bug** [L3504-3548] — Observable arrays deep-wrap items in proxies, breaking `indexOf`. Fix: `observable.array([], { deep: false })`
2. **queueProcessor is single-consumer** [L3247-3270] — Removes items after processing. Second processor sees nothing. Workaround: one processor per event type, fan-out to multiple handlers inside.
3. **fromResource examples use `observable.clear()`** [L4030-4070] — Nukes ALL listeners, not just the one being cleaned up. Docs have this wrong.
4. **ADR-001 (explicit scene) becomes moot with ECS** [L3593-3669] — `createTransformer` captures scene once in closure. Don't revert now; retire after migration.

# Verified Claims (29 unit + 4 integration tests pass)

- Babylon disposal cascade, scene registration, parenting [8 tests]
- Miniplex entity creation, queries, lifecycle events, reindexing [11 tests]
- createTransformer memoization/cleanup, queueProcessor, fromResource [10 tests]
- MobX overhead: 0.009ms/frame (budget is 16.67ms) — negligible

# Still Unverified / Pending

- No migration plan/ordering documented
- No entity type definitions for actual game
- Controller reconnect duplicate saber bug (ECS should solve by design)
- Spark particles + haptic pulse
