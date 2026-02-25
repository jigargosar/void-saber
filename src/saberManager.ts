import { Scene } from '@babylonjs/core/scene';
import { WebXRInput } from '@babylonjs/core/XR/webXRInput';
import { Vector3 } from '@babylonjs/core/Maths/math';
import { Theme, isHand, handColor } from './theme';
import { buildSaber, BLADE_RADIUS, BladeSegment } from './saberBuilder';
import { createTrail } from './trail';
import { segmentDistance } from './collision';

const INTERSECT_DIST = BLADE_RADIUS * 2;

export interface SaberManager {
  onIntersect: ((point: Vector3) => void) | null;
}

export function createSaberManager(scene: Scene, input: WebXRInput, theme: Theme): SaberManager {
  const blades: BladeSegment[] = [];

  const manager: SaberManager = { onIntersect: null };

  input.onControllerAddedObservable.add((source) => {
    const handedness = source.inputSource.handedness;
    if (!isHand(handedness)) return;

    const name  = `saber_${handedness}`;
    const color = handColor(theme, handedness);
    const saber = buildSaber(name, color, scene);
    const trail = createTrail(name, saber.blade.base, saber.blade.tip, color, scene);

    source.onMotionControllerInitObservable.addOnce(() => {
      if (source.grip) saber.root.parent = source.grip;
      trail.start();
    });

    blades.push(saber.blade);

    if (blades.length === 2) {
      scene.onBeforeRenderObservable.add(() => {
        const { dist, point } = segmentDistance(
          blades[0].base.getAbsolutePosition(), blades[0].tip.getAbsolutePosition(),
          blades[1].base.getAbsolutePosition(), blades[1].tip.getAbsolutePosition(),
        );
        if (dist < INTERSECT_DIST && manager.onIntersect) {
          manager.onIntersect(point);
        }
      });
    }
  });

  return manager;
}
