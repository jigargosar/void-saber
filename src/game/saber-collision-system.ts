import { type System } from '../ecs';
import { type SaberCollisionEvent } from './types';
import { collidableSabers } from './world';
import { INTERSECT_DIST } from './saber';
import { segmentDistance } from '../collision';

export function createSaberCollisionSystem(
  onCollision: (event: SaberCollisionEvent) => void,
): System {
  return () => {
    if (collidableSabers.size < 2) return;

    const entities = collidableSabers.entities;
    const a = entities[0];
    const b = entities[1];

    const { dist, point } = segmentDistance(
      a.saber.blade.base.getAbsolutePosition(), a.saber.blade.tip.getAbsolutePosition(),
      b.saber.blade.base.getAbsolutePosition(), b.saber.blade.tip.getAbsolutePosition(),
    );

    if (dist < INTERSECT_DIST) {
      onCollision({ point, inputA: a.input, inputB: b.input });
    }
  };
}
