import { type System } from '../ecs';
import { type CollisionEvent } from './types';
import { activeSabers } from './world';
import { INTERSECT_DIST } from './saber';
import { segmentDistance } from '../collision';

export function createCollisionSystem(
  onCollision: (event: CollisionEvent) => void,
): System {
  return () => {
    if (activeSabers.size < 2) return;

    const entities = activeSabers.entities;
    const a = entities[0].saber.blade;
    const b = entities[1].saber.blade;

    const { dist, point } = segmentDistance(
      a.base.getAbsolutePosition(), a.tip.getAbsolutePosition(),
      b.base.getAbsolutePosition(), b.tip.getAbsolutePosition(),
    );

    if (dist < INTERSECT_DIST) {
      onCollision({ point });
    }
  };
}
