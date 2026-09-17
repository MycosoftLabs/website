/**
 * Overlay z-order. Depth-Anything-V2 is not bound in this Next process.
 * Relative rank only: smaller = closer to camera. Never invent meters.
 */

export const DEPTH_SOURCE = "unbound-heuristic" as const

export interface RankedContour {
  id: string
  kind: string
  pts: [number, number][]
  x: number
  y: number
  w: number
  h: number
  /** 0 = nearest, 1 = farthest. Not meters. */
  rel_depth: number
  depth_m: null
  depth_source: typeof DEPTH_SOURCE
  near_field: boolean
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function relativeDepth(kind: string, id: string, box: { x: number; y: number; w: number; h: number }): number {
  const cy = box.y + box.h * 0.5
  const cx = box.x + box.w * 0.5
  const lower = clamp(cy, 0, 1)
  const mid = 1 - Math.abs(cx - 0.5) * 0.35
  if (kind === "fungus" || id.includes("elf-ear") || id.includes("litmus")) return 0.02
  // Look-down trail + handheld: lower frame and center are nearer the lens.
  return clamp(1 - lower * 0.72 * mid, 0.08, 0.98)
}

export function rankContours(
  items: { id: string; kind: string; pts: [number, number][]; x: number; y: number; w: number; h: number }[],
): RankedContour[] {
  return items
    .map((item) => {
      const rel = relativeDepth(item.kind, item.id, item)
      return {
        ...item,
        rel_depth: rel,
        depth_m: null,
        depth_source: DEPTH_SOURCE,
        near_field: rel < 0.22 || item.kind === "fungus",
      }
    })
    .sort((a, b) => b.rel_depth - a.rel_depth)
}

function inside(p: [number, number], b: RankedContour, pad = 0.012) {
  return p[0] >= b.x - pad && p[0] <= b.x + b.w + pad && p[1] >= b.y - pad && p[1] <= b.y + b.h + pad
}

/** Drop far-contour vertices that sit on a nearer instance. Near wins. */
export function occludeByNearer(contour: RankedContour, nearer: RankedContour[]): [number, number][] {
  if (!nearer.length) return contour.pts
  return contour.pts.filter((p) => !nearer.some((n) => inside(p, n)))
}

export function nearerThan(sortedFarFirst: RankedContour[], index: number) {
  return sortedFarFirst.slice(index + 1)
}
