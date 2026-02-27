import { Position, Velocity, Rotation, IsPlayer } from './traits'
import { Time, world } from './world'
import { movementSystem } from './movement-system'
import { initInput, inputSystem } from './input-bridge'
import { initRenderer, renderSystem } from './render'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Element #${id} not found`)
  return el as T
}

function clampToBounds(
  canvasWidth: number,
  canvasHeight: number,
): void {
  world.query(Position, IsPlayer).updateEach(([pos]) => {
    if (pos.x < 0) pos.x = 0
    if (pos.x > canvasWidth) pos.x = canvasWidth
    if (pos.y < 0) pos.y = 0
    if (pos.y > canvasHeight) pos.y = canvasHeight
  })
}

function startGame(): void {
  const canvas = requireElement<HTMLCanvasElement>('arena-canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  initRenderer(canvas)
  initInput()

  // Spawn player at center
  world.spawn(
    Position({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }),
    Velocity,
    Rotation,
    IsPlayer,
  )

  let prev = performance.now()

  function loop(now: number): void {
    const delta = (now - prev) / 1000
    prev = now

    world.set(Time, { delta, elapsed: now / 1000 })

    inputSystem()
    movementSystem()
    clampToBounds(CANVAS_WIDTH, CANVAS_HEIGHT)
    renderSystem(CANVAS_WIDTH, CANVAS_HEIGHT)

    requestAnimationFrame(loop)
  }

  requestAnimationFrame(loop)
}

startGame()
