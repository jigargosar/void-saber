import { type WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience';
import { type Teardown } from '../ecs';
import { isHand } from '../theme';
import { world } from './world';

export function bridgeInput(input: WebXRDefaultExperience['input']): Teardown {
  const addObs = input.onControllerAddedObservable.add((source) => {
    const handedness = source.inputSource.handedness;
    if (!isHand(handedness)) return;
    world.add({ hand: handedness, input: source });
  });

  const removeObs = input.onControllerRemovedObservable.add((source) => {
    for (const entity of world) {
      if (entity.input === source) {
        world.remove(entity);
        break;
      }
    }
  });

  return () => {
    input.onControllerAddedObservable.remove(addObs);
    input.onControllerRemovedObservable.remove(removeObs);
  };
}
