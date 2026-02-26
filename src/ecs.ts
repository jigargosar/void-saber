/**
 * Generic ECS framework layer.
 * Miniplex + MobX wiring utilities.
 * Zero game knowledge — reusable in any project.
 */
import { type Query } from 'miniplex';
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
 */
export function onEnter<E>(query: Query<E>, cb: (entity: E) => void): Teardown {
  return query.onEntityAdded.subscribe(cb);
}

/**
 * Fires callback once per entity leaving the query.
 * Miniplex preserves entity intact in the callback.
 * Returns a teardown to unsubscribe.
 */
export function onExit<E>(query: Query<E>, cb: (entity: E) => void): Teardown {
  return query.onEntityRemoved.subscribe(cb);
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

interface EventQueue<T> {
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

// ── Re-exports for convenience ─────────────────────────────────────

export { World, type Query } from 'miniplex';
export type { With, Without } from 'miniplex';
