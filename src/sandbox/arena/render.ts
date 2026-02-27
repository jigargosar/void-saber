import { createQuery } from 'koota'
import { IsPlayer, Position, Rotation } from './traits'
import { world } from './world'

const playerQuery = createQuery(IsPlayer, Position, Rotation)

const PLAYER_SIZE = 14
const BG_COLOR = '#0a0a0f'
const PLAYER_COLOR = '#00ffcc'

let ctx: CanvasRenderingContext2D

export function initRenderer(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context unavailable')
  ctx = context
}

export function renderSystem(canvasWidth: number, canvasHeight: number): void {
  // Clear
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Draw player as a directional triangle
  world.query(playerQuery).readEach(([pos, rot]) => {
    ctx.save()
    ctx.translate(pos.x, pos.y)
    ctx.rotate(rot.angle)

    ctx.beginPath()
    ctx.moveTo(PLAYER_SIZE, 0)
    ctx.lineTo(-PLAYER_SIZE * 0.6, -PLAYER_SIZE * 0.5)
    ctx.lineTo(-PLAYER_SIZE * 0.6, PLAYER_SIZE * 0.5)
    ctx.closePath()

    ctx.fillStyle = PLAYER_COLOR
    ctx.fill()

    ctx.restore()
  })
}
