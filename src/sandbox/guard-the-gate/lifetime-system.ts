import { type System } from '../../ecs';
import { type Seconds } from './types';
import { world, activeParticles } from './world';

export function createLifetimeSystem(getDt: () => Seconds): System {
  return () => {
    const dt = getDt();
    for (const entity of activeParticles) {
      entity.lifetime -= dt;
      if (entity.lifetime <= 0) {
        world.remove(entity);
      }
    }
  };
}
