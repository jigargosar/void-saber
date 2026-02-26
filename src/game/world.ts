import { World } from '../ecs';
import { type Entity } from './types';

export const world = new World<Entity>();

// Lifecycle hooks
export const controllers = world.with('hand', 'input');

// Per-frame system queries
export const needsGrip    = world.with('input', 'saber', 'trailBuffers', 'trailMesh').without('gripBound');
export const activeTrails = world.with('saber', 'trailBuffers', 'trailMesh', 'gripBound');
export const activeSabers = world.with('saber', 'gripBound');
