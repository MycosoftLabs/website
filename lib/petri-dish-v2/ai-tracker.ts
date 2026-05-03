/**
 * AI colony tracker — browser prefers ONNX Runtime Web when bundled; falls back to Seg service proxy.
 * No mock masks: empty tracks when backend has no ONNX model.
 * Date: May 02, 2026
 */

export interface SegmentResult {
  tracks: unknown[]
  mask: number[][] | unknown[]
  metrics: Record<string, unknown>
}

export async function segmentFrameRgb(
  image: number[][][],
  frameIdx: number
): Promise<SegmentResult> {
  const res = await fetch("/api/simulation/petri-seg/segment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, frame_idx: frameIdx }),
  })
  const data = (await res.json()) as SegmentResult
  return data
}

/** Downsample canvas ImageData to H×W×3 float 0..1 for the Seg service */
export function canvasToModelInput(
  ctx: CanvasRenderingContext2D,
  maxSide: number
): number[][][] {
  const { width, height } = ctx.canvas
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const w = Math.max(1, Math.floor(width * scale))
  const h = Math.max(1, Math.floor(height * scale))
  const tmp = document.createElement("canvas")
  tmp.width = w
  tmp.height = h
  const tctx = tmp.getContext("2d")
  if (!tctx) return []
  tctx.drawImage(ctx.canvas, 0, 0, w, h)
  const img = tctx.getImageData(0, 0, w, h)
  const out: number[][][] = []
  for (let y = 0; y < h; y++) {
    const row: number[][] = []
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      row.push([
        img.data[i] / 255,
        img.data[i + 1] / 255,
        img.data[i + 2] / 255,
      ])
    }
    out.push(row)
  }
  return out
}
