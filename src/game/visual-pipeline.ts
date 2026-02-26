import { type Teardown, onEnter, onExit } from '../ecs';
import { type Theme, handColor } from '../theme';
import { world, controllers } from './world';
import { buildSaber } from './saber';
import { buildTrail } from './trail';

export function createVisualPipeline(theme: Theme): Teardown {
  const teardowns: Teardown[] = [];

  teardowns.push(onEnter(controllers, (entity) => {
    const name = `saber_${entity.hand}`;
    const color = handColor(theme, entity.hand);

    const saber = buildSaber(name, color);
    const trail = buildTrail(name, color);

    world.update(entity, {
      saber,
      trailMesh: trail.mesh,
      trailBuffers: trail.buffers,
    });
  }));

  teardowns.push(onExit(controllers, (entity) => {
    if (entity.saber) entity.saber.root.dispose(false, true);
    if (entity.trailMesh) entity.trailMesh.dispose(false, true);
  }));

  return () => { for (const td of teardowns) td(); };
}
