/** Per-frame trail-bed corridor. Image-space L/R edges from the current frame. */

export interface CorridorSample {
  y: number
  left: number
  right: number
  center: number
  width: number
  trailness: number
}

export interface PathCorridor {
  left: [number, number][]
  right: [number, number][]
  fill: [number, number][]
  vanish: [number, number] | null
  heading_rad: number
  source: "frame-luma-edge"
}

function trailScore(r: number, g: number, b: number) {
  const l = (r + g + b) / 3
  const greenExcess = g - (r + b) * 0.5
  return l - 0.72 * Math.max(0, greenExcess) - 0.15 * Math.max(0, 90 - l)
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function emptyCorridor(): PathCorridor {
  return { left: [], right: [], fill: [], vanish: null, heading_rad: 0, source: "frame-luma-edge" }
}

function isRectish(left: [number, number][], right: [number, number][]) {
  if (left.length < 3) return true
  const spanL = Math.max(...left.map((p) => p[0])) - Math.min(...left.map((p) => p[0]))
  const spanR = Math.max(...right.map((p) => p[0])) - Math.min(...right.map((p) => p[0]))
  const widths = left.map((p, i) => (right[i]?.[0] ?? p[0]) - p[0])
  const wMin = Math.min(...widths)
  const wMax = Math.max(...widths)
  return spanL < 0.05 && spanR < 0.05 && wMax - wMin < 0.04
}

export function extractCorridor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  prev: PathCorridor | null,
): PathCorridor {
  const samples: CorridorSample[] = []
  const y0 = Math.round(0.96 * (height - 1))
  const y1 = Math.round(0.36 * (height - 1))
  const rows = 22
  const yStep = Math.max(2, Math.round((y0 - y1) / rows))
  let prevCenter =
    prev && prev.left.length && prev.right.length
      ? (prev.left[0][0] + prev.right[0][0]) / 2
      : 0.5

  for (let y = y0, row = 0; y >= y1 && row < rows; y -= yStep, row += 1) {
    const scores: number[] = []
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4
      scores.push(trailScore(data[o], data[o + 1], data[o + 2]))
    }
    const search = row === 0 ? Math.round(width * 0.48) : Math.max(10, Math.round(width * 0.28))
    const seed = clamp(Math.round(prevCenter * (width - 1)), 2, width - 3)
    let best = seed
    let bestS = scores[seed] ?? 0
    for (let x = Math.max(1, seed - search); x < Math.min(width - 1, seed + search); x += 1) {
      if (scores[x] > bestS) {
        bestS = scores[x]
        best = x
      }
    }
    const cut = bestS * 0.62
    let L = best
    let R = best
    while (L > 1 && scores[L] > cut) L -= 1
    while (R < width - 2 && scores[R] > cut) R += 1
    const left = L / width
    const right = R / width
    const center = (left + right) / 2
    const w = right - left
    if (w < 0.05 || bestS < 16) continue
    samples.push({ y: y / (height - 1), left, right, center, width: w, trailness: bestS })
    prevCenter = center
  }

  if (samples.length < 6) return emptyCorridor()

  const left = samples.map((s) => [s.left, s.y] as [number, number])
  const right = samples.map((s) => [s.right, s.y] as [number, number])
  if (isRectish(left, right) && samples.every((s) => s.trailness < 28)) return emptyCorridor()

  const fill = [...left, ...[...right].reverse()]
  const vanish = [samples[samples.length - 1].center, samples[samples.length - 1].y] as [number, number]
  const a = samples[0]
  const b = samples[samples.length - 1]
  const heading = Math.atan2(b.center - a.center, a.y - b.y)
  return { left, right, fill, vanish, heading_rad: heading, source: "frame-luma-edge" }
}

export function smoothCorridor(prev: PathCorridor | null, next: PathCorridor, alpha = 0.62): PathCorridor {
  if (!next || next.left.length < 6) return next
  if (!prev || prev.left.length < 6) return next
  const n = Math.min(prev.left.length, next.left.length)
  const mix = (a: [number, number], b: [number, number]): [number, number] => [
    a[0] * (1 - alpha) + b[0] * alpha,
    a[1] * (1 - alpha) + b[1] * alpha,
  ]
  const left = next.left.slice(0, n).map((p, i) => mix(prev.left[i] ?? p, p))
  const right = next.right.slice(0, n).map((p, i) => mix(prev.right[i] ?? p, p))
  return {
    left,
    right,
    fill: [...left, ...[...right].reverse()],
    vanish: next.vanish,
    heading_rad: prev.heading_rad * (1 - alpha) + next.heading_rad * alpha,
    source: "frame-luma-edge",
  }
}
