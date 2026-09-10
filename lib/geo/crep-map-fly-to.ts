/**
 * Camera fly-to helpers for CREP / NatureOS Earth Sim.
 *
 * Sep 10, 2026 — retry until MapLibre is loaded/idle so Slide 2 / San Diego
 * chips do not silently no-op when the globe is still starting or the
 * caller passed a ref instead of the map instance.
 */
import type { Map as MapLibreMap } from "maplibre-gl"

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined
type FlyOpts = Record<string, unknown> & {
  center?: [number, number]
  zoom?: number
  pitch?: number
  bearing?: number
  duration?: number
  essential?: boolean
  onEnd?: () => void
}
type Engine = "legacy" | "v3"

function resolveMap(m: MapLike): MapLibreMap | null {
  if (!m) return null
  if (typeof (m as MapLibreMap).flyTo === "function") return m as MapLibreMap
  return (m as { current?: MapLibreMap | null }).current ?? null
}

function flyWhenReady(map: MapLibreMap, opts: FlyOpts): void {
  const { onEnd, ...camera } = opts
  const run = () => {
    try {
      map.stop?.()
      map.flyTo({
        center: camera.center,
        zoom: camera.zoom,
        pitch: camera.pitch ?? 0,
        bearing: camera.bearing ?? 0,
        duration: camera.duration ?? 1600,
        essential: camera.essential ?? true,
      } as never)
      if (onEnd) {
        map.once?.("moveend", () => {
          try { onEnd() } catch { /* ignore */ }
        })
      }
    } catch {
      try { map.easeTo?.(camera as never) } catch { /* */ }
    }
  }
  const loaded = typeof map.loaded === "function" ? map.loaded() : true
  if (loaded) {
    run()
    return
  }
  map.once?.("load", run)
  map.once?.("idle", run)
}

export function crepMapFlyTo(map: MapLike, opts: FlyOpts, _engine: Engine = "legacy"): void {
  const tryFly = (attempt: number) => {
    const m = resolveMap(map)
    if (m) {
      flyWhenReady(m, opts)
      return
    }
    if (attempt >= 20) return
    if (typeof window === "undefined") return
    window.setTimeout(() => tryFly(attempt + 1), 250)
  }
  tryFly(0)
}

export function crepMapJumpOrFly(map: MapLike, opts: FlyOpts, _engine: Engine = "legacy"): void {
  const m = resolveMap(map)
  if (!m) {
    crepMapFlyTo(map, opts, _engine)
    return
  }
  try {
    if (opts && opts.duration === 0) m.jumpTo(opts as never)
    else flyWhenReady(m, opts)
  } catch { /* */ }
}

export function crepMapTiltFlyTo(map: MapLike, opts: FlyOpts, _engine: Engine = "legacy"): void {
  crepMapFlyTo(map, opts, _engine)
}
