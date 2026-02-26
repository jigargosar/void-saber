import { type System } from '../ecs';
import { world, needsGrip } from './world';
import { startTrail } from './trail';

export function createGripBindSystem(): System {
  return () => {
    for (const entity of needsGrip) {
      const grip = entity.input.grip;
      if (!grip) continue;
      entity.saber.root.parent = grip;
      startTrail(entity.trailBuffers, entity.trailMesh, entity.saber.blade);
      world.addComponent(entity, 'gripBound', true);
    }
  };
}
