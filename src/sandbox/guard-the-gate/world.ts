import { World } from '../../ecs';
import { type Entity } from './types';

export const world = new World<Entity>();

// ── Entity-kind queries (for lifecycle: onEnter/onExit) ─────────────

export const enemies   = world.with('enemy', 'position', 'health', 'sprite');
export const bullets   = world.with('bullet', 'position', 'sprite');
export const powerUps  = world.with('powerUp', 'position', 'sprite');
export const particles = world.with('particle', 'position', 'lifetime', 'sprite');

// ── Polling system queries ──────────────────────────────────────────

/** Movable entities excluding frozen — movement system. */
export const activeMovables = world.with('position', 'velocity').without('frozen');

/** All entities with visuals — render position sync. */
export const renderables = world.with('position', 'sprite');

/** Turret entity — input bridge updates aim. */
export const turrets = world.with('turret', 'aimAngle');

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
