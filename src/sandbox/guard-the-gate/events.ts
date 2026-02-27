/**
 * Event types for fire-and-forget event queues.
 * Each event carries all data the handler needs —
 * handlers don't query the world.
 */

import { type Entity, type Hp } from './types';

/** Bullet hit an enemy. */
export interface DamageEvent {
  readonly target: Entity;
  readonly source: Entity;
  readonly amount: Hp;
}

/** Enemy reached the gate. */
export interface BreachEvent {
  readonly enemy: Entity;
}

/** Player collected a power-up. */
export interface CollectEvent {
  readonly powerUp: Entity;
}
