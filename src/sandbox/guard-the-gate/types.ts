/**
 * Entity type for Guard the Gate.
 * Every possible component as an optional field.
 * Each actual entity only populates a few.
 */

// ── Domain type aliases ─────────────────────────────────────────────

export type EnemyTypeId = string;
export type PowerUpTypeId = string;
export type Px = number;
export type PxPerSec = number;
export type Seconds = number;
export type Hp = number;

// ── Component types ─────────────────────────────────────────────────

export interface Position {
  x: Px;
  y: Px;
}

export interface Velocity {
  dx: PxPerSec;
  dy: PxPerSec;
}

export interface Health {
  current: Hp;
  max: Hp;
}

// ── Sprite reference ────────────────────────────────────────────────

export interface Sprite {
  readonly el: HTMLDivElement;
}

// ── Entity ──────────────────────────────────────────────────────────

export type Entity = {
  // Shared components
  position?: Position;
  velocity?: Velocity;
  health?: Health;
  sprite?: Sprite;

  // Entity-kind tags (presence = membership)
  enemy?: true;
  bullet?: true;
  powerUp?: true;
  turret?: true;
  particle?: true;

  // Entity-kind data (separate from tags)
  enemyType?: EnemyTypeId;
  powerUpType?: PowerUpTypeId;
  damage?: Hp;

  // Stateful interaction components
  hovered?: true;
  frozen?: Seconds;    // remaining freeze time
  shielded?: true;

  // Particle lifetime
  lifetime?: Seconds;

  // Turret-specific
  aimAngle?: number;   // radians
};
