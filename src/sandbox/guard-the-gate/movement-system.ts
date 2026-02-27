import { type System } from '../../ecs';
import { type Seconds } from './types';
import { activeMovables } from './world';

export function createMovementSystem(getDt: () => Seconds): System {
  return () => {
    const dt = getDt();
    for (const entity of activeMovables) {
      entity.position.x += entity.velocity.dx * dt;
      entity.position.y += entity.velocity.dy * dt;
    }
  };
}
