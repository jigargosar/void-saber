import { Scene } from '@babylonjs/core/scene';
import { WebXRInput } from '@babylonjs/core/XR/webXRInput';
import { WebXRInputSource } from '@babylonjs/core/XR/webXRInputSource';
import { Vector3 } from '@babylonjs/core/Maths/math';
import { Theme, isHand, handColor } from '../theme';
import { buildSaber, Saber, BLADE_RADIUS, BladeSegment } from './saberBuilder';
import { createTrail, Trail } from './trail';
import { segmentDistance } from '../collision';

const INTERSECT_DIST = BLADE_RADIUS * 2;

export interface SaberManager {
  onIntersect: ((point: Vector3) => void) | null;
}

function onGripReady(saber: Saber, trail: Trail, source: WebXRInputSource): void {
  if (source.grip) saber.root.parent = source.grip;
  trail.start();
}

function checkIntersection(a: BladeSegment, b: BladeSegment, manager: SaberManager): void {
  const { dist, point } = segmentDistance(
    a.base.getAbsolutePosition(), a.tip.getAbsolutePosition(),
    b.base.getAbsolutePosition(), b.tip.getAbsolutePosition(),
  );
  if (dist < INTERSECT_DIST && manager.onIntersect) {
    manager.onIntersect(point);
  }
}

export function createSaberManager(scene: Scene, input: WebXRInput, theme: Theme): SaberManager {
  const blades: BladeSegment[] = [];
  const manager: SaberManager = { onIntersect: null };

  input.onControllerAddedObservable.add((source) => {
    const handedness = source.inputSource.handedness;
    if (!isHand(handedness)) return;

    const name  = `saber_${handedness}`;
    const color = handColor(theme, handedness);
    const saber = buildSaber(name, color);
    const trail = createTrail(name, saber.blade.base, saber.blade.tip, color, scene);

    blades.push(saber.blade);

    source.onMotionControllerInitObservable.addOnce(
      () => onGripReady(saber, trail, source),
    );
  });

  scene.onBeforeRenderObservable.add(() => {
    if (blades.length === 2) checkIntersection(blades[0], blades[1], manager);
  });

  return manager;
}
