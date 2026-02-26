/**
 * Generic ECS framework layer.
 * Miniplex + MobX + mobx-utils wiring utilities.
 * Zero game knowledge — reusable in any project.
 */
import { type Query } from 'miniplex';
import { observable, autorun, runInAction, type IObservableArray } from 'mobx';
import { createTransformer, queueProcessor } from 'mobx-utils';
import type { IDisposer } from 'mobx-utils/lib/utils';

// ── Types ──────────────────────────────────────────────────────────

/** A system is a zero-arg function called once per frame. */
export type System = () => void;

/** Disposer returned by bridge/event setup for teardown. */
export type Teardown = IDisposer;

// ── Reactive Bridge: Query → Observable Array ──────────────────────

/**
 * Bridges a miniplex query into a MobX shallow observable array.
 * Preserves object identity (deep: false avoids proxy wrapping).
 * Returns the observable array + teardown function.
 */
export function bridgeQuery<E>(query: Query<E>): {
  entities: IObservableArray<E>;
  dispose: Teardown;
} {
  const entities = observable.array<E>([], { deep: false });

  // Seed with existing entities
  for (const e of query) {
    entities.push(e);
  }

  const unsub1 = query.onEntityAdded.subscribe((e) =>
    runInAction(() => entities.push(e)),
  );
  const unsub2 = query.onEntityRemoved.subscribe((e) =>
    runInAction(() => {
      const i = entities.indexOf(e);
      if (i >= 0) entities.splice(i, 1);
    }),
  );

  return {
    entities,
    dispose: () => { unsub1(); unsub2(); },
  };
}

// ── Entity → Visual Bridge (createTransformer wrapper) ─────────────

/**
 * Creates a memoized entity→visual transformer with auto-cleanup.
 * Must be consumed inside an autorun or other MobX reaction.
 *
 * @param create  Given an entity, produce its visual representation.
 * @param cleanup Called when the entity leaves all reactions (dispose visuals).
 */
export function entityVisualBridge<E, V>(
  create: (entity: E) => V,
  cleanup: (visual: V | undefined, entity?: E) => void,
): (entity: E) => V {
  return createTransformer(create, cleanup);
}

/**
 * Drives a transformer over a bridged observable array inside an autorun.
 * Returns a dispose function that tears down the autorun.
 */
export function driveTransformer<E, V>(
  entities: IObservableArray<E>,
  transformer: (entity: E) => V,
): Teardown {
  return autorun(() => {
    for (const e of entities) {
      transformer(e);
    }
  });
}

// ── Event Queue ────────────────────────────────────────────────────

/**
 * Creates a typed event queue backed by a MobX observable array.
 * Single-consumer: one processor dispatches to all handlers.
 *
 * @param processor Called once per event pushed to the queue.
 * @returns push function + dispose teardown.
 */
export function createEventQueue<T>(
  processor: (event: T) => void,
): {
  push: (event: T) => void;
  dispose: Teardown;
} {
  const queue = observable.array<T>([], { deep: false });
  const dispose = queueProcessor(queue, processor);
  return {
    push: (event: T) => runInAction(() => queue.push(event)),
    dispose,
  };
}

// ── System Pipeline ────────────────────────────────────────────────

/**
 * Creates a pipeline runner from an ordered array of systems.
 * Call the returned function once per frame.
 */
export function createPipeline(systems: System[]): System {
  return () => {
    for (const system of systems) {
      system();
    }
  };
}

// ── Disposal Hooks ─────────────────────────────────────────────────

/**
 * Subscribes a cleanup callback to a query's onEntityRemoved event.
 * When an entity leaves the query (removed from world or component stripped),
 * the callback fires. Returns a teardown to unsubscribe.
 */
export function onRemoved<E>(
  query: Query<E>,
  callback: (entity: E) => void,
): Teardown {
  return query.onEntityRemoved.subscribe(callback);
}

// ── Re-exports for convenience ─────────────────────────────────────

export { World, type Query } from 'miniplex';
export type { With, Without } from 'miniplex';
