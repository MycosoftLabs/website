/**
 * High-contrast canvas lettering for Fungi Compute charts.
 * White fill + black stroke so ticks stay neon-readable on black glass.
 */

export const FUNGI_CANVAS_LABEL = "#ffffff"
export const FUNGI_CANVAS_LABEL_SOFT = "#f8fafc"

export function drawCanvasLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options?: {
    align?: CanvasTextAlign
    baseline?: CanvasTextBaseline
    font?: string
    fill?: string
  }
) {
  const align = options?.align ?? ctx.textAlign
  const baseline = options?.baseline ?? ctx.textBaseline
  const font = options?.font ?? "bold 12px monospace"
  const fill = options?.fill ?? FUNGI_CANVAS_LABEL

  ctx.save()
  ctx.font = font
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.lineJoin = "round"
  ctx.miterLimit = 2
  ctx.lineWidth = 3.5
  ctx.strokeStyle = "rgba(0, 0, 0, 0.92)"
  ctx.strokeText(text, x, y)
  ctx.fillStyle = fill
  ctx.shadowColor = "rgba(165, 243, 252, 0.55)"
  ctx.shadowBlur = 4
  ctx.fillText(text, x, y)
  ctx.restore()
}
