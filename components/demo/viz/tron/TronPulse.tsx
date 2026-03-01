import { applyGlow } from "./tronColors"

interface TronPulseOptions {
  radius?: number
  lineWidth?: number
  glow?: number
  alpha?: number
}

export function drawTronPulse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  options: TronPulseOptions = {}
) {
  const radius = options.radius ?? 12
  const lineWidth = options.lineWidth ?? 2
  const glow = options.glow ?? 14
  const alpha = options.alpha ?? 0.6

  applyGlow(ctx, color, glow)
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}
