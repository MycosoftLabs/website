/** One smooth ground/sky split. Not Canny spaghetti. DA-V2 unbound. */

export interface HorizonLine {
  polyline: [number, number][]
  source: "smoothed-sky-break"
  confidence: number
  depth_bind: "UNBOUND"
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function extractHorizon(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  prev: HorizonLine | null,
): HorizonLine {
  const cols = 9
  const breaks: number[] = []
  for (let c = 0; c < cols; c += 1) {
    const x = Math.round((0.1 + (c / (cols - 1)) * 0.8) * (width - 1))
    let yHit = 0.26
    for (let y = 2; y < Math.floor(height * 0.48); y += 1) {
      const o = (y * width + x) * 4
      const l = (data[o] + data[o + 1] + data[o + 2]) / 3
      const o2 = (Math.min(height - 1, y + 4) * width + x) * 4
      const l2 = (data[o2] + data[o2 + 1] + data[o2 + 2]) / 3
      if (l - l2 > 26) {
        yHit = y / height
        break
      }
    }
    breaks.push(yHit)
  }
  const sorted = [...breaks].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const iqr = sorted[sorted.length - 2] - sorted[1]
  const polyline: [number, number][] = []
  for (let i = 0; i <= 8; i += 1) {
    const u = 0.03 + (i / 8) * 0.94
    const bend = iqr < 0.1 ? Math.sin((i / 8) * Math.PI) * 0.018 : 0
    polyline.push([u, clamp(median + bend, 0.1, 0.4)])
  }
  const alpha = 0.45
  const mixed =
    prev && prev.polyline.length === polyline.length
      ? polyline.map((p, i) => {
          const q = prev.polyline[i]
          return [p[0] * alpha + q[0] * (1 - alpha), p[1] * alpha + q[1] * (1 - alpha)] as [number, number]
        })
      : polyline
  return {
    polyline: mixed,
    source: "smoothed-sky-break",
    confidence: iqr < 0.1 ? 0.62 : 0.34,
    depth_bind: "UNBOUND",
  }
}
