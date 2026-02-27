import { type System } from '../../ecs';
import { type BreachEvent } from './events';
import { livingEnemies } from './world';
import { GATE_Y } from './data';

export function createGateCollisionSystem(
  onBreach: (event: BreachEvent) => void,
): System {
  return () => {
    for (const enemy of livingEnemies) {
      if (enemy.position.y >= GATE_Y) {
        onBreach({ enemy });
      }
    }
  };
}
