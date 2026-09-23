/**
 * One trail parameter 0–1 shared by the forward path bed and the overhead crop.
 * Walk on the overhead photo is bottom → top along the video-segment red line.
 */

export const OVERHEAD_CROP = { cx: 0.398, cy: 0.54, zoom: 3.8 }

/** Full red stroke on Morgan's overhead photo (normalized). */
export const OVERHEAD_RED_LINE: [number, number][] = [
  [0.385, 0.575],
  [0.392, 0.555],
  [0.4, 0.532],
  [0.408, 0.518],
  [0.412, 0.505],
]

/** Video clip = lower segment of that red line. */
export const OVERHEAD_VIDEO_SEGMENT: [number, number][] = [
  [0.385, 0.575],
  [0.392, 0.555],
  [0.4, 0.532],
]

export const STEP_SPACING_M = 0.38
export const STEP_CHAIN_CAP = 3

export interface RouteProgress {
  t_norm: number
  along: number
  map_pct: [number, number]
  segment_pct: [number, number][]
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function lerpPath(pts: [number, number][], t: number): [number, number] {
  const u = clamp(t, 0, 1)
  if (pts.length < 2) return pts[0] ?? [0.5, 0.5]
  const scaled = u * (pts.length - 1)
  const i = Math.min(pts.length - 2, Math.floor(scaled))
  const f = scaled - i
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]
}

/** Photo-normalized → percent inside the 3.8× crop square. */
export function photoToCropPct(p: [number, number]): [number, number] {
  const { cx, cy, zoom } = OVERHEAD_CROP
  const u = (p[0] - (cx - 0.5 / zoom)) * zoom
  const v = (p[1] - (cy - 0.5 / zoom)) * zoom
  return [clamp(u, 0, 1) * 100, clamp(v, 0, 1) * 100]
}

/** Project overhead red-line into video: y near=start of clip, y far=up the red line. */
export function mapCenterAtVideoY(y: number): { x: number; heading: number } {
  const near = 0.92
  const far = 0.42
  const along = clamp((near - y) / (near - far), 0, 1)
  const a = lerpPath(OVERHEAD_VIDEO_SEGMENT, along)
  const b = lerpPath(OVERHEAD_VIDEO_SEGMENT, Math.min(1, along + 0.12))
  const heading = Math.atan2(b[0] - a[0], -(b[1] - a[1]))
  const x = clamp(0.5 + (a[0] - OVERHEAD_VIDEO_SEGMENT[0][0]) * 6.5, 0.36, 0.64)
  return { x, heading }
}

export function routeProgress(tNorm: number): RouteProgress {
  const along = clamp(tNorm, 0, 1)
  return {
    t_norm: along,
    along,
    map_pct: photoToCropPct(lerpPath(OVERHEAD_VIDEO_SEGMENT, along)),
    segment_pct: OVERHEAD_VIDEO_SEGMENT.map(photoToCropPct),
  }
}
