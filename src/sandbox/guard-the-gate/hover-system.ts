import { Vec2 } from 'planck';
import { type System } from '../../ecs';
import { type Position } from './types';
import { world, groundPowerUps } from './world';
import { HOVER_RADIUS } from './data';

export function createHoverSystem(
  getMouse: () => Position,
): System {
  return () => {
    const mouse = getMouse();
    for (const entity of groundPowerUps) {
      const dist = Vec2.distance(entity.position, mouse);
      const isNear = dist < HOVER_RADIUS;
      const isHovered = entity.hovered === true;

      if (isNear && !isHovered) {
        world.addComponent(entity, 'hovered', true);
      } else if (!isNear && isHovered) {
        world.removeComponent(entity, 'hovered');
      }
    }
  };
}
