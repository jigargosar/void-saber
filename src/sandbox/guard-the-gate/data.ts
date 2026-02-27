/**
 * Non-ECS data lookups.
 * Plain data structures — no entities, no queries, no systems.
 * Read by systems at spawn time or on event handling.
 */

import { type EnemyTypeId, type PowerUpTypeId, type Hp, type PxPerSec } from './types';

// ── Enemy types ─────────────────────────────────────────────────────

export interface EnemyTypeDef {
  readonly speed: PxPerSec;
  readonly health: Hp;
  readonly color: string;
  readonly size: number;
}

export const ENEMY_TYPES: ReadonlyMap<EnemyTypeId, EnemyTypeDef> = new Map([
  ['grunt',   { speed: 60,  health: 1, color: '#e74c3c', size: 20 }],
  ['tank',    { speed: 30,  health: 3, color: '#8e44ad', size: 28 }],
  ['speedster', { speed: 120, health: 1, color: '#f39c12', size: 16 }],
]);

// ── Power-up types ──────────────────────────────────────────────────

export type PowerUpEffect = 'freeze' | 'shield' | 'heal';

export interface PowerUpTypeDef {
  readonly effect: PowerUpEffect;
  readonly duration: number;  // seconds (for freeze/shield)
  readonly color: string;
}

export const POWER_UP_TYPES: ReadonlyMap<PowerUpTypeId, PowerUpTypeDef> = new Map([
  ['freeze', { effect: 'freeze', duration: 3,  color: '#3498db' }],
  ['shield', { effect: 'shield', duration: 5,  color: '#2ecc71' }],
  ['heal',   { effect: 'heal',   duration: 0,  color: '#e91e63' }],
]);

// ── Wave definitions ────────────────────────────────────────────────

export interface WaveDef {
  readonly count: number;
  readonly delayMs: number;  // ms between spawns within wave
  readonly enemyType: EnemyTypeId;
}

export const WAVES: readonly WaveDef[] = [
  { count: 3, delayMs: 800,  enemyType: 'grunt' },
  { count: 2, delayMs: 1200, enemyType: 'tank' },
  { count: 5, delayMs: 500,  enemyType: 'speedster' },
  { count: 4, delayMs: 600,  enemyType: 'grunt' },
  { count: 3, delayMs: 800,  enemyType: 'tank' },
  { count: 6, delayMs: 400,  enemyType: 'speedster' },
];

// ── Game constants ──────────────────────────────────────────────────

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 800;
export const GATE_Y = CANVAS_HEIGHT - 40;
export const BULLET_SPEED: PxPerSec = 400;
export const BULLET_DAMAGE: Hp = 1;
export const BULLET_RADIUS = 4;
export const HOVER_RADIUS = 30;
export const POWER_UP_DROP_CHANCE = 0.4;
export const TURRET_Y = GATE_Y - 20;
