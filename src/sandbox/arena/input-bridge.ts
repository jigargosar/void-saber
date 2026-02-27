import { createQuery } from 'koota'
import { IsPlayer, Velocity, Rotation } from './traits'
import { world } from './world'

/** Pixels per second when holding a movement key. */
const MOVE_SPEED = 200

const playerQuery = createQuery(IsPlayer, Velocity, Rotation)

const keys = new Set<string>()

export function initInput(): void {
  window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()))
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))
}

export function inputSystem(): void {
  let dx = 0
  let dy = 0

  if (keys.has('w') || keys.has('arrowup')) dy -= 1
  if (keys.has('s') || keys.has('arrowdown')) dy += 1
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1
  if (keys.has('d') || keys.has('arrowright')) dx += 1

  // Normalize diagonal movement
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len > 0) {
    dx /= len
    dy /= len
  }

  world.query(playerQuery).updateEach(([vel, rot]) => {
    vel.vx = dx * MOVE_SPEED
    vel.vy = dy * MOVE_SPEED

    // Face movement direction
    if (len > 0) {
      rot.angle = Math.atan2(dy, dx)
    }
  })
}
