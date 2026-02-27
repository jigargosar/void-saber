import { trait } from 'koota'

/** Position in canvas pixels. Schema-based → SoA internally. */
export const Position = trait({ x: 0, y: 0 })

/** Velocity in pixels per second. Schema-based → SoA internally. */
export const Velocity = trait({ vx: 0, vy: 0 })

/** Facing direction in radians. Schema-based → SoA internally. */
export const Rotation = trait({ angle: 0 })

/** Marks the player entity. Tag trait → no data. */
export const IsPlayer = trait()
