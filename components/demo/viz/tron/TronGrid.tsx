import { applyGlow, TRON_COLORS } from "./tronColors"

interface TronGridOptions {
  cellSize?: number
  color?: string
  glow?: number
}

export function drawTronGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: TronGridOptions = {}
) {
  const cellSize = options.cellSize ?? 48
  const color = options.color ?? TRON_COLORS.lane
  const glow = options.glow ?? 4

  ctx.strokeStyle = color
  ctx.lineWidth = 1
  applyGlow(ctx, "#00ffff", glow)

  for (let x = 0; x <= width; x += cellSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y <= height; y += cellSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.shadowBlur = 0
}
