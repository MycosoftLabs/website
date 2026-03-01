import { applyGlow } from "./tronColors"

interface TronParticleOptions {
  radius?: number
  alpha?: number
  glow?: number
  length?: number
}

export function drawTronParticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  options: TronParticleOptions = {}
) {
  const radius = options.radius ?? 2.5
  const alpha = options.alpha ?? 0.6
  const glow = options.glow ?? 12
  const length = options.length ?? 0

  applyGlow(ctx, color, glow)
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  if (length > 0) {
    ctx.lineWidth = 1
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(x - length, y)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}
