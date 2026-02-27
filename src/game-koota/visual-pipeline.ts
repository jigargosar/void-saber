import { type Theme, isHand, handColor } from '../theme'
import { world } from './world'
import { HandTrait, InputSource, Saber, TrailMesh, TrailData } from './traits'
import { buildSaber } from './saber'
import { buildTrail } from './trail'

/**
 * Lifecycle pipeline: creates/disposes saber + trail visuals
 * when controllers enter/leave the world.
 *
 * Uses Koota's onQueryAdd/onQueryRemove — direct replacement
 * for Miniplex's onEnter/onExit.
 */
export function createVisualPipeline(theme: Theme): () => void {
  const unsubAdd = world.onQueryAdd([HandTrait, InputSource], (entity) => {
    const hand = entity.get(HandTrait)
    if (!hand || !isHand(hand)) return

    const name = `saber_${hand}`
    const color = handColor(theme, hand)

    const saber = buildSaber(name, color)
    const trail = buildTrail(name, color)

    entity.add(
      Saber(saber),
      TrailMesh(trail.mesh),
      TrailData(trail.buffers),
    )
  })

  const unsubRemove = world.onQueryRemove([HandTrait, InputSource], (entity) => {
    const saber = entity.get(Saber)
    if (saber) saber.root.dispose(false, true)

    const trailMesh = entity.get(TrailMesh)
    if (trailMesh) trailMesh.dispose(false, true)
  })

  return () => {
    unsubAdd()
    unsubRemove()
  }
}
