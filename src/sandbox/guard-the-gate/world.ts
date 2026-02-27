import { World } from '../../ecs';
import { type Entity } from './types';

export const world = new World<Entity>();

// ── Lifecycle queries (onEnter creates sprite, onExit cleans up) ─────

export const enemySpawns    = world.with('enemy', 'position', 'health');
export const bulletSpawns   = world.with('bullet', 'position');
export const powerUpSpawns  = world.with('powerUp', 'position');
export const particleSpawns = world.with('particle', 'position', 'lifetime');

// ── Polling system queries ──────────────────────────────────────────

/** Movable entities excluding frozen — movement system. */
export const activeMovables = world.with('position', 'velocity').without('frozen');

/** All entities with visuals — render position sync. */
export const renderables = world.with('position', 'sprite');

/** Turret entity — input bridge updates aim, render syncs rotation. */
export const turrets = world.with('turret', 'aimAngle', 'position');

/** Living enemies — bullet collision targets. */
export const livingEnemies = world.with('enemy', 'position', 'health');

/** Enemies that can move — excludes frozen. */
export const unfrozenEnemies = world.with('enemy', 'position', 'velocity').without('frozen');

/** Frozen enemies — thaw system. */
export const frozenEnemies = world.with('enemy', 'frozen', 'sprite');

/** Active bullets — for collision checks and offscreen removal. */
export const activeBullets = world.with('bullet', 'position');

/** Power-ups on the ground — hover detection. */
export const groundPowerUps = world.with('powerUp', 'position');

/** Hovered power-ups — for selection. */
export const hoveredPowerUps = world.with('powerUp', 'hovered', 'sprite');

/** Particles with lifetime — decay system. */
export const activeParticles = world.with('particle', 'lifetime');
