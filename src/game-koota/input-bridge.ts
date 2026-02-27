import { type WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience'
import { isHand } from '../theme'
import { world } from './world'
import { HandTrait, InputSource } from './traits'

/**
 * Bridges WebXR controller events into the Koota world.
 * Spawns entity on connect, destroys on disconnect.
 * Returns teardown function.
 */
export function bridgeInput(input: WebXRDefaultExperience['input']): () => void {
  const addObs = input.onControllerAddedObservable.add((source) => {
    const handedness = source.inputSource.handedness
    if (!isHand(handedness)) return
    world.spawn(HandTrait(handedness), InputSource(source))
  })

  const removeObs = input.onControllerRemovedObservable.add((source) => {
    for (const entity of world.query(InputSource)) {
      const input = entity.get(InputSource)
      if (input === source) {
        entity.destroy()
        break
      }
    }
  })

  return () => {
    input.onControllerAddedObservable.remove(addObs)
    input.onControllerRemovedObservable.remove(removeObs)
  }
}
