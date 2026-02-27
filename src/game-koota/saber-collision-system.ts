import { world } from './world'
import { InputSource, Saber, GripBound } from './traits'
import { type SaberCollisionEvent } from './types'
import { INTERSECT_DIST } from './saber'
import { segmentDistance } from '../collision'

export function createSaberCollisionSystem(
  onCollision: (event: SaberCollisionEvent) => void,
): () => void {
  return () => {
    const entities = [...world.query(InputSource, Saber, GripBound)]
    if (entities.length < 2) return

    const a = entities[0]
    const b = entities[1]

    const saberA = a.get(Saber)
    const saberB = b.get(Saber)
    const inputA = a.get(InputSource)
    const inputB = b.get(InputSource)

    if (!saberA || !saberB || !inputA || !inputB) return

    const { dist, point } = segmentDistance(
      saberA.blade.base.getAbsolutePosition(), saberA.blade.tip.getAbsolutePosition(),
      saberB.blade.base.getAbsolutePosition(), saberB.blade.tip.getAbsolutePosition(),
    )

    if (dist < INTERSECT_DIST) {
      onCollision({ point, inputA, inputB })
    }
  }
}
