/**
 * Vessel LOD — Apr 22, 2026
 *
 * Morgan: "at zoom out seeing world i need to see at least 30% of all
 * vessles boats shipping tankers, oil tankers, then with each zoom in
 * tick i need more in viewport and none outside of viewport".
 *
 * Zoom-dependent level-of-detail selector for the vessel / aircraft
 * point layers. Three regimes:
 *
 *   z ≤ 2  — WORLD. Show a stratified global sample of ≥ 30% of the
 *            full pool, spatially even so major shipping lanes aren't
 *            all of the 30%. No viewport cull (world-wide view).
 *
 *   z 3–6  — REGIONAL. Viewport cull first, then show a progressive
 *            fraction of what's inside — 40% at z3 climbing to 100% by
 *            z6. Lets the user see density trends without piling 10k
 *            points into a mid-range view.
 *
 *   z ≥ 7  — LOCAL. Viewport cull only, no sampling. Every vessel the
 *            map owns inside the bbox paints. Nothing outside the
 *            viewport ever goes to the GPU.
 *
 * All three paths strictly filter "nothing outside viewport" for zoom ≥
 * 3. At zoom ≤ 2 the viewport IS the world, so the stratified sample
 * IS the whole world.
 */
import { cullToViewport, type Bbox } from "@/lib/crep/map-perf"

/** Minimum fraction of the pool rendered at world zoom. Morgan: "≥ 30%". */
export const WORLD_MIN_FRACTION = 0.35

/**
 * Split the lat/lng plane into an N × N grid and return at most
 * `perCell` features per cell — preserves spatial diversity when the
 * pool is skewed (e.g. the English Channel has 10× the AIS density of
 * the South Atlantic; round-robin sampling would bury the Atlantic).
 */
function stratifiedGridSample<T extends { geometry?: { type?: string; coordinates?: any }; properties?: Record<string, any> }>(
  features: T[],
  perCell: number,
  gridN = 24,
): T[] {
  if (!features?.length || perCell <= 0) return []
  const cells = new Map<string, T[]>()
  for (const f of features) {
    const c = f.geometry?.coordinates
    const lng = Array.isArray(c) && typeof c[0] === "number" ? c[0] : Number(f.properties?.lng)
    const lat = Array.isArray(c) && typeof c[1] === "number" ? c[1] : Number(f.properties?.lat)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
    // Map (-180..180) × (-90..90) → (0..gridN-1) × (0..gridN-1)
    const gx = Math.min(gridN - 1, Math.max(0, Math.floor(((lng + 180) / 360) * gridN)))
    const gy = Math.min(gridN - 1, Math.max(0, Math.floor(((lat + 90) / 180) * gridN)))
    const key = `${gx}:${gy}`
    const bucket = cells.get(key)
    if (bucket) bucket.push(f)
    else cells.set(key, [f])
  }
  const out: T[] = []
  for (const bucket of cells.values()) {
    if (bucket.length <= perCell) {
      for (const f of bucket) out.push(f)
    } else {
      // Evenly strided pick across the bucket — keeps the sample stable
      // between ticks (no random jitter flicker).
      const step = bucket.length / perCell
      for (let i = 0; i < perCell; i++) out.push(bucket[Math.floor(i * step)])
    }
  }
  return out
}

/**
 * Pick the subset of vessels/aircraft to upload to the GPU this tick.
 *
 * Contract:
 *   - Nothing outside the viewport is ever returned for zoom ≥ 3.
 *   - At zoom ≤ 2 the fraction returned is ≥ WORLD_MIN_FRACTION.
 *   - Each zoom step up returns ≥ the previous step's count in the
 *     same viewport, up to the per-viewport pool size.
 *
 * @param all      Full pool of features (already mergeById-deduped).
 * @param bbox     Current MapLibre viewport bbox.
 * @param zoom    Current MapLibre zoom level.
 * @param pad      Viewport padding in degrees (default 2 — keeps
 *                 entities near the edge from popping in/out).
 */
export function selectForZoom<T extends { geometry?: { type?: string; coordinates?: any }; properties?: Record<string, any> }>(
  all: T[],
  bbox: Bbox | null | undefined,
  zoom: number,
  pad = 2,
): T[] {
  if (!all?.length) return []

  // World zoom — stratified global sample with ≥ 30% coverage.
  if (!Number.isFinite(zoom) || zoom <= 2) {
    const target = Math.max(Math.ceil(all.length * WORLD_MIN_FRACTION), Math.min(all.length, 600))
    // Cell grid of 24 × 24 = 576 cells. perCell chosen so cells.length*perCell ≈ target.
    const perCell = Math.max(1, Math.ceil(target / 300))
    const sampled = stratifiedGridSample(all, perCell, 24)
    // If stratification undershot (pool is very sparse), top up with
    // evenly-strided picks so we still hit the 30% floor.
    if (sampled.length < target) {
      const step = Math.max(1, Math.floor(all.length / (target - sampled.length)))
      const have = new Set(sampled)
      for (let i = 0; i < all.length && sampled.length < target; i += step) {
        const f = all[i]
        if (!have.has(f)) { sampled.push(f); have.add(f) }
      }
    }
    return sampled
  }

  // Regional + local — viewport cull FIRST so we never show anything
  // outside the bbox.
  const inView = cullToViewport(all, bbox, pad)
  if (zoom >= 7) return inView

  // Regional: z3 → 40%, z4 → 55%, z5 → 75%, z6 → 100%.
  const frac = Math.min(1, 0.4 + (zoom - 3) * 0.15)
  if (frac >= 1) return inView

  const target = Math.ceil(inView.length * frac)
  const perCell = Math.max(1, Math.ceil(target / 100))
  const sampled = stratifiedGridSample(inView, perCell, 10)
  if (sampled.length < target) {
    const step = Math.max(1, Math.floor(inView.length / Math.max(1, target - sampled.length)))
    const have = new Set(sampled)
    for (let i = 0; i < inView.length && sampled.length < target; i += step) {
      const f = inView[i]
      if (!have.has(f)) { sampled.push(f); have.add(f) }
    }
  }
  return sampled
}
