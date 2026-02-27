import { createQuery } from 'koota'
import { Position, Velocity } from './traits'
import { Time, world } from './world'

const movables = createQuery(Position, Velocity)

export function movementSystem(): void {
  const time = world.get(Time)
  if (!time) return

  world.query(movables).updateEach(([pos, vel]) => {
    pos.x += vel.vx * time.delta
    pos.y += vel.vy * time.delta
  })
}
