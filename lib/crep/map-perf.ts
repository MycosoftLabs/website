/**
 * Map-performance helpers — Apr 22, 2026
 *
 * Morgan: "make the entire crep system efficient with all rendering level
 * of detail memory managment it needs to run flawlessly".
 *
 * Two utilities the entity pump can adopt incrementally:
 *
 *  1. cullToViewport(features, bbox, pad)
 *     Returns only features whose lng/lat fall within the MapLibre
 *     viewport plus `pad` degrees of padding. Typical reduction at
 *     city zoom: 90 %+ fewer features uploaded to the GPU per tick.
 *
 *  2. makeDebouncedSetData(getSource)
 *     Returns a function that coalesces rapid setData calls into one
 *     requestAnimationFrame invocation. Rapid pump-burst scenarios
 *     (aircraft + vessel + sat pumps all setData-ing within the same
 *     frame) collapse to a single GPU upload per source per frame.
 *
 * Both helpers are pure and side-effect-free at module load — safe
 * to import from any client component and SSR-inert.
 */

/** Lat/lng bbox — matches MapLibre's `map.getBounds().toBBox()` ordering. */
export interface Bbox {
  north: number
  south: number
  east: number
  west: number
}

/**
 * Cull a GeoJSON feature array down to features inside the viewport
 * (plus `pad` degrees of padding so entities near the edge don't pop in).
 *
 * Handles antimeridian-wrapped bboxes (east < west) by accepting features
 * on either side. For non-Point geometries, reads `properties.lat`/`lng`
 * when present; otherwise keeps the feature (conservative fallback).
 */
export function cullToViewport<T extends { geometry?: { type?: string; coordinates?: any }; properties?: Record<string, any> }>(
  features: T[],
  bbox: Bbox | null | undefined,
  pad = 2,
): T[] {
  if (!bbox || !Number.isFinite(bbox.north) || !Number.isFinite(bbox.south)) return features
  const s = bbox.south - pad
  const n = bbox.north + pad
  const w = bbox.west - pad
  const e = bbox.east + pad
  const crossesAM = w > e // e.g. w=175, e=-175
  const out: T[] = []
  for (const f of features) {
    let lng: number | undefined
    let lat: number | undefined
    const c = f.geometry?.coordinates
    if (f.geometry?.type === "Point" && Array.isArray(c) && c.length >= 2) {
      lng = c[0]; lat = c[1]
    } else if (f.properties) {
      const p = f.properties
      lng = Number(p.lng ?? p.longitude)
      lat = Number(p.lat ?? p.latitude)
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) { out.push(f); continue }
    } else {
      out.push(f); continue
    }
    if (lat! < s || lat! > n) continue
    if (crossesAM) {
      if (lng! >= w || lng! <= e) out.push(f)
    } else {
      if (lng! >= w && lng! <= e) out.push(f)
    }
  }
  return out
}

/**
 * Wrap a source.setData call so rapid invocations within the same
 * animation frame coalesce into one GPU upload. Returns a function
 * that accepts the FeatureCollection and schedules the write.
 *
 * Usage:
 *   const setAc = makeDebouncedSetData(() => map.getSource("crep-live-aircraft") as any)
 *   setAc({ type: "FeatureCollection", features: acFeats })
 *
 * Safe to call during SSR — rAF is guarded. Calling with `null` flushes
 * any pending write immediately.
 */
export function makeDebouncedSetData(getSource: () => { setData?: (fc: any) => void } | null | undefined) {
  let rafId: number | null = null
  let pending: any = null
  const flush = () => {
    rafId = null
    if (pending == null) return
    const data = pending
    pending = null
    try {
      const src = getSource()
      if (src?.setData) src.setData(data)
    } catch { /* ignore — source may be gone mid-HMR */ }
  }
  const schedule = (fc: any) => {
    if (typeof window === "undefined") {
      try {
        const src = getSource()
        if (src?.setData) src.setData(fc)
      } catch { /* ignore */ }
      return
    }
    pending = fc
    if (rafId != null) return
    if (typeof window.requestAnimationFrame === "function") {
      rafId = window.requestAnimationFrame(flush)
    } else {
      rafId = window.setTimeout(flush, 0) as unknown as number
    }
  }
  schedule.flush = flush
  return schedule
}
