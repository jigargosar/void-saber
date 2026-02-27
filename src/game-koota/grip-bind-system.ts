import { Not } from 'koota'
import { world } from './world'
import { InputSource, Saber, TrailMesh, TrailData, GripBound } from './traits'
import { startTrail } from './trail'

/**
 * Polling system: parents saber to XR grip once available.
 * Queries entities that have saber + trail but NOT yet GripBound.
 *
 * Koota equivalent of the Miniplex needsGrip query
 * (.with('input','saber','trailBuffers','trailMesh').without('gripBound')).
 */
export function gripBindSystem(): void {
  for (const entity of world.query(InputSource, Saber, TrailMesh, TrailData, Not(GripBound))) {
    const input = entity.get(InputSource)
    const saber = entity.get(Saber)
    const trailData = entity.get(TrailData)
    const trailMesh = entity.get(TrailMesh)

    if (!input || !saber || !trailData || !trailMesh) continue

    const grip = input.grip
    if (!grip) continue

    saber.root.parent = grip
    startTrail(trailData, trailMesh, saber.blade)
    entity.add(GripBound)
  }
}
