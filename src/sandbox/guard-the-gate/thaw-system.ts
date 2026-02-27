import { type System } from '../../ecs';
import { type Seconds } from './types';
import { world, frozenEnemies } from './world';

export function createThawSystem(getDt: () => Seconds): System {
  return () => {
    const dt = getDt();
    for (const entity of frozenEnemies) {
      const remaining = (entity.frozen ?? 0) - dt;
      if (remaining <= 0) {
        world.removeComponent(entity, 'frozen');
      } else {
        entity.frozen = remaining;
      }
    }
  };
}
