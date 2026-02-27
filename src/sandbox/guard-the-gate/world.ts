import { World } from '../../ecs';
import { type Entity } from './types';

export const world = new World<Entity>();

// ── Entity-kind queries (for lifecycle: onEnter/onExit) ─────────────

export const enemies   = world.with('enemy', 'position', 'health', 'sprite');
export const bullets   = world.with('bullet', 'position', 'sprite');
export const powerUps  = world.with('powerUp', 'position', 'sprite');
export const particles = world.with('particle', 'position', 'lifetime', 'sprite');

// ── Polling system queries ──────────────────────────────────────────

/** All moving entities — movement system. */
export const movables = world.with('position', 'velocity');

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
