import { createWorld, trait } from 'koota'

/** Frame timing singleton. Added to world, not to entities. */
export const Time = trait({ delta: 0, elapsed: 0 })

export const world = createWorld()
world.add(Time)
