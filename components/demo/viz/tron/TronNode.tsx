import { applyGlow } from "./tronColors"

interface TronNodeOptions {
  radius?: number
  glow?: number
}

export function drawTronNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  options: TronNodeOptions = {}
) {
  const radius = options.radius ?? 4
  const glow = options.glow ?? 10
  applyGlow(ctx, color, glow)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}
