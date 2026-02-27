/**
 * ECS framework — fixed copy for Space Rocks sandbox.
 *
 * Based on src/ecs.ts (Miniplex + MobX wiring utilities).
 * Additions over the original:
 *   - createLifecycleHook  (Issues 2, 4 — circular queries, re-index in callback)
 *   - safeRemove           (Issue 5  — double-remove undefined behavior)
 *   - createTeardownCollector (Issue 9 — leaked resources)
 *
 * See docs/spikes/space-rocks/design.md for why each fix exists.
 */
import { World, type Query } from 'miniplex';
import { observable, reaction } from 'mobx';

// ── Types ──────────────────────────────────────────────────────────

/** A system is a zero-arg function called once per frame. */
export type System = () => void;

/** Disposer returned by lifecycle/event setup for teardown. */
export type Teardown = () => void;

// ── Entity lifecycle hooks (event layer — miniplex native) ────────

/**
 * Fires callback once per entity entering the query.
 * Returns a teardown to unsubscribe.
 *
 * Prefer createLifecycleHook when the callback needs to add components.
 * Use raw onEnter only for side-effect-only reactions (e.g. logging).
 */
export function onEnter<E>(query: Query<E>, cb: (entity: E) => void): Teardown {
  return query.onEntityAdded.subscribe(cb);
}

/**
 * Fires callback once per entity leaving the query.
 * Miniplex preserves entity intact in the callback.
 * Returns a teardown to unsubscribe.
 *
 * Prefer createLifecycleHook when paired with onEnter that adds components.
 */
export function onExit<E>(query: Query<E>, cb: (entity: E) => void): Teardown {
  return query.onEntityRemoved.subscribe(cb);
}

// ── Lifecycle Hook (fixes Issues 2, 4) ────────────────────────────

/**
 * Creates a lifecycle hook that safely adds components on entity enter
 * and runs cleanup on entity exit.
 *
 * RULE: The trigger query must NOT include components that onEnter creates.
 * This prevents circular deadlocks where an entity can never enter the
 * query because the component it needs is created by the handler that
 * requires the entity to already be in the query.
 *
 * The onEnter callback receives an `add` helper that calls
 * world.addComponent internally. The consumer never calls addComponent
 * inside a lifecycle callback — the framework handles it.
 *
 * @example
 * ```ts
 * const enemySpawns = world.with('enemy', 'position', 'health');
 *
 * createLifecycleHook(world, enemySpawns, {
 *   onEnter: (entity, add) => {
 *     const el = createSprite(entity);
 *     add('sprite', { el });
 *   },
 *   onExit: (entity) => {
 *     entity.sprite?.el.remove();
 *   },
 * });
 * ```
 */
export function createLifecycleHook<E extends {}>(
  world: World<E>,
  triggerQuery: Query<E>,
  hooks: {
    onEnter?: (
      entity: E,
      add: <K extends keyof E>(component: K, value: E[K]) => void,
    ) => void;
    onExit?: (entity: E) => void;
  },
): Teardown {
  const teardowns: Teardown[] = [];

  if (hooks.onEnter) {
    const enterCb = hooks.onEnter;
    teardowns.push(triggerQuery.onEntityAdded.subscribe((entity: E) => {
      enterCb(entity, (component, value) => {
        world.addComponent(entity, component, value);
      });
    }));
  }

  if (hooks.onExit) {
    teardowns.push(triggerQuery.onEntityRemoved.subscribe(hooks.onExit));
  }

  return () => { for (const t of teardowns) t(); };
}

// ── Safe Remove (fixes Issue 5) ───────────────────────────────────

/**
 * Removes an entity from the world if it is still present. No-ops if
 * the entity was already removed. Returns whether removal happened.
 *
 * Use this instead of world.remove() to prevent double-remove bugs
 * (e.g. two bullets hitting the same enemy in one frame).
 */
export function safeRemove<E extends object>(world: World<E>, entity: E): boolean {
  if (!world.has(entity)) return false;
  world.remove(entity);
  return true;
}

// ── Reactive state (reaction layer — MobX) ────────────────────────

/**
 * Creates a reactive state cell. MobX is the implementation detail.
 * If we ever swap to signals or nanostores, call sites don't change.
 */
export function state<T>(initial: T): { get(): T; set(v: T): void } {
  const box = observable.box(initial, { deep: false });
  return {
    get: () => box.get(),
    set: (v: T) => box.set(v),
  };
}

/**
 * Reacts to observable changes. Uses reaction (not autorun) —
 * only tracks observables in the read function. The effect callback
 * is untracked, preventing spurious re-triggers.
 */
export function reactTo<T>(read: () => T, effect: (value: T) => void): Teardown {
  return reaction(read, effect, { fireImmediately: true });
}

// ── Event queue (fire-and-forget events) ──────────────────────────

export interface EventQueue<T> {
  push: (event: T) => void;
  flush: () => void;
  dispose: Teardown;
}

/**
 * Creates a typed event queue. No MobX — simple buffer + flush.
 * Single-consumer: one handler dispatches to all concerns.
 * Pipeline calls flush() at end of frame automatically.
 */
export function createEventQueue<T>(handler: (event: T) => void): EventQueue<T> {
  const queue: T[] = [];
  return {
    push: (event: T) => { queue.push(event); },
    flush: () => {
      for (let i = 0; i < queue.length; i++) handler(queue[i]);
      queue.length = 0;
    },
    dispose: () => { queue.length = 0; },
  };
}

// ── System Pipeline ────────────────────────────────────────────────

/**
 * Creates a pipeline runner. Systems run first, then all queues flush.
 * Consumer can't forget to flush or flush in wrong order.
 */
export function createPipeline(systems: System[], queues?: { flush(): void }[]): System {
  return () => {
    for (const system of systems) system();
    if (queues) for (const q of queues) q.flush();
  };
}

// ── Teardown Collector (fixes Issue 9) ─────────────────────────────

export interface TeardownCollector {
  /** Register a teardown to be called on shutdown. */
  add(teardown: Teardown): void;
  /** Run all registered teardowns in reverse order (LIFO), then clear. */
  shutdown(): void;
}

/**
 * Collects teardown functions from all setup calls. A single shutdown()
 * call cleans up everything in reverse registration order.
 *
 * @example
 * ```ts
 * const collector = createTeardownCollector();
 * collector.add(createLifecycleHook(world, query, hooks));
 * collector.add(createEventQueue(handler).dispose);
 * collector.add(bridgeKeyboard(canvas, world));
 * // ...later:
 * collector.shutdown();
 * ```
 */
export function createTeardownCollector(): TeardownCollector {
  const teardowns: Teardown[] = [];
  return {
    add: (teardown: Teardown) => { teardowns.push(teardown); },
    shutdown: () => {
      for (let i = teardowns.length - 1; i >= 0; i--) teardowns[i]();
      teardowns.length = 0;
    },
  };
}

// ── Re-exports for convenience ─────────────────────────────────────

export { World, type Query };
export type { With, Without } from 'miniplex';
