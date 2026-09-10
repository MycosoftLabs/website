/**
 * Earth Sim viewport cull + animated-layer memory governor.
 *
 * Date: September 10, 2026
 *
 * Logical detail: while the camera is framed on the United States (or any
 * other region), heavy Live Data / radar / wind work must not keep the rest
 * of the planet in GPU memory. MapLibre already drops off-screen XYZ tiles;
 * this module supplies a *logical* viewport (camera frustum + pad) so image
 * overlays, GeoJSON fetches, and wind particles stay inside that window.
 *
 * Fail-closed: heap / WebGL / hidden-tab pressure pauses the oldest animated
 * overlay. Static ECM/AM/env stays. The globe is never blanked. Fly buttons
 * keep using `crepMapFlyTo` retry.
 *
 * No mock data. RJ Ricasata = CFO.
 */

export type LngLatBounds = { west: number; south: number; east: number; north: number }

export type AnimatedLayerKind = "radar" | "wind" | "field-raster" | "lightning"

export interface AnimatedLayerHandle {
  id: string
  kind: AnimatedLayerKind
  pause: () => void
  resume: () => void
  registeredAt: number
}

export interface GovernorSnapshot {
  viewport: LngLatBounds | null
  animatedIds: string[]
  pausedIds: string[]
  maxAnimated: number
  hiddenTab: boolean
  webglLost: boolean
  heapUsedMb: number | null
  heapLimitMb: number | null
  pressure: "ok" | "warn" | "critical"
  event: string
}

const VIEWPORT_PAD = 0.12
const MAX_ANIMATED_DEFAULT = 2
const HEAP_WARN_RATIO = 0.78
const HEAP_CRITICAL_RATIO = 0.86
const HEAP_CRITICAL_MB = 1600

const handles = new Map<string, AnimatedLayerHandle>()
const paused = new Set<string>()
const listeners = new Set<(snap: GovernorSnapshot) => void>()
let lastViewport: LngLatBounds | null = null

function clampLat(n: number): number {
  return Math.max(-85, Math.min(85, n))
}

function wrapLng(n: number): number {
  if (!Number.isFinite(n)) return 0
  let x = n
  while (x < -180) x += 360
  while (x > 180) x -= 360
  return x
}

function maxSpanForZoom(zoom: number): { lng: number; lat: number } {
  if (zoom >= 6) return { lng: 18, lat: 12 }
  if (zoom >= 4.5) return { lng: 36, lat: 24 }
  if (zoom >= 3) return { lng: 72, lat: 48 }
  if (zoom >= 2) return { lng: 110, lat: 70 }
  return { lng: 160, lat: 100 }
}

function readHeap(): { usedMb: number | null; limitMb: number | null } {
  try {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
    if (!mem?.usedJSHeapSize) return { usedMb: null, limitMb: null }
    return {
      usedMb: Math.round(mem.usedJSHeapSize / 1_048_576),
      limitMb: Math.round((mem.jsHeapSizeLimit || 0) / 1_048_576),
    }
  } catch {
    return { usedMb: null, limitMb: null }
  }
}

function hiddenTab(): boolean {
  return typeof document !== "undefined" && document.hidden
}

function webglLost(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { __crep_webgl_lost?: boolean }).__crep_webgl_lost)
}

function pressureOf(heapUsedMb: number | null, heapLimitMb: number | null): GovernorSnapshot["pressure"] {
  if (webglLost()) return "critical"
  if (heapUsedMb != null && heapUsedMb >= HEAP_CRITICAL_MB) return "critical"
  if (heapUsedMb != null && heapLimitMb && heapLimitMb > 0) {
    const ratio = heapUsedMb / heapLimitMb
    if (ratio >= HEAP_CRITICAL_RATIO) return "critical"
    if (ratio >= HEAP_WARN_RATIO) return "warn"
  }
  return "ok"
}

export function getLogicalViewportBounds(
  map: { getBounds?: () => { getWest(): number; getSouth(): number; getEast(): number; getNorth(): number }; getZoom?: () => number; getCenter?: () => { lng: number; lat: number }; getCanvas?: () => HTMLCanvasElement; unproject?: (p: [number, number]) => { lng: number; lat: number } } | null | undefined,
  pad = VIEWPORT_PAD,
): LngLatBounds | null {
  if (!map) return lastViewport
  try {
    const canvas = map.getCanvas?.()
    const w = canvas?.clientWidth || 0
    const h = canvas?.clientHeight || 0
    const zoom = Number(map.getZoom?.() ?? 3)
    const center = map.getCenter?.()
    const spanCap = maxSpanForZoom(zoom)

    let west = NaN
    let south = NaN
    let east = NaN
    let north = NaN

    if (canvas && w > 8 && h > 8 && typeof map.unproject === "function") {
      const px = Math.round(w * pad)
      const py = Math.round(h * pad)
      const corners: [number, number][] = [
        [-px, -py],
        [w + px, -py],
        [w + px, h + py],
        [-px, h + py],
        [w / 2, -py],
        [w / 2, h + py],
        [-px, h / 2],
        [w + px, h / 2],
      ]
      const lats: number[] = []
      const lngs: number[] = []
      for (const [x, y] of corners) {
        const ll = map.unproject([x, y])
        if (!ll || !Number.isFinite(ll.lat) || !Number.isFinite(ll.lng)) continue
        lats.push(ll.lat)
        lngs.push(ll.lng)
      }
      if (lats.length >= 3 && center) {
        south = clampLat(Math.min(...lats))
        north = clampLat(Math.max(...lats))
        const mid = center.lng
        const rel = lngs.map((lng) => {
          let d = lng - mid
          while (d > 180) d -= 360
          while (d < -180) d += 360
          return d
        })
        west = wrapLng(mid + Math.min(...rel))
        east = wrapLng(mid + Math.max(...rel))
      }
    }

    if (!Number.isFinite(south) || !Number.isFinite(north) || south >= north) {
      const b = map.getBounds?.()
      if (!b) return lastViewport
      west = b.getWest()
      south = b.getSouth()
      east = b.getEast()
      north = b.getNorth()
    }

    if (center) {
      const latSpan = Math.max(0.4, north - south)
      const rawLngSpan = east > west ? east - west : 360 - (west - east)
      if (latSpan > spanCap.lat) {
        const half = spanCap.lat / 2
        south = clampLat(center.lat - half)
        north = clampLat(center.lat + half)
      }
      if (rawLngSpan > spanCap.lng) {
        const half = spanCap.lng / 2
        west = wrapLng(center.lng - half)
        east = wrapLng(center.lng + half)
      }
    }

    if (!Number.isFinite(west) || !Number.isFinite(east) || !Number.isFinite(south) || !Number.isFinite(north)) {
      return lastViewport
    }
    if (south >= north) return lastViewport
    lastViewport = { west, south, east, north }
    return lastViewport
  } catch {
    return lastViewport
  }
}

export function boundsIntersect(a: LngLatBounds | null | undefined, b: LngLatBounds | [number, number, number, number] | null | undefined): boolean {
  if (!a || !b) return true
  const bb = Array.isArray(b) ? { west: b[0], south: b[1], east: b[2], north: b[3] } : b
  if (a.north < bb.south || a.south > bb.north) return false
  const aWraps = a.west > a.east
  const bWraps = bb.west > bb.east
  if (aWraps || bWraps) return true
  return !(a.east < bb.west || a.west > bb.east)
}

export function pointInBounds(lng: number, lat: number, b: LngLatBounds | null | undefined): boolean {
  if (!b) return true
  if (lat < b.south || lat > b.north) return false
  if (b.west <= b.east) return lng >= b.west && lng <= b.east
  return lng >= b.west || lng <= b.east
}

export function bboxQueryString(b: LngLatBounds): string {
  return `${b.west.toFixed(3)},${b.south.toFixed(3)},${b.east.toFixed(3)},${b.north.toFixed(3)}`
}

/** OpenSky / AIS / FR24 bbox. Allows dateline wrap (lomin > lomax). */
export function moverBboxQuery(b: LngLatBounds | null | undefined): string | null {
  if (!b) return null
  if (![b.west, b.south, b.east, b.north].every(Number.isFinite)) return null
  if (b.south >= b.north) return null
  return `lamin=${b.south.toFixed(3)}&lamax=${b.north.toFixed(3)}&lomin=${b.west.toFixed(3)}&lomax=${b.east.toFixed(3)}`
}

export function publishGovernor(event: string): GovernorSnapshot {
  const heap = readHeap()
  const snap: GovernorSnapshot = {
    viewport: lastViewport,
    animatedIds: [...handles.keys()],
    pausedIds: [...paused],
    maxAnimated: MAX_ANIMATED_DEFAULT,
    hiddenTab: hiddenTab(),
    webglLost: webglLost(),
    heapUsedMb: heap.usedMb,
    heapLimitMb: heap.limitMb,
    pressure: pressureOf(heap.usedMb, heap.limitMb),
    event,
  }
  if (typeof window !== "undefined") {
    ;(window as unknown as { __crep_memory_governor: GovernorSnapshot }).__crep_memory_governor = snap
  }
  for (const fn of listeners) {
    try { fn(snap) } catch { /* probe listeners must not throw */ }
  }
  return snap
}

function pauseHandle(id: string): void {
  const h = handles.get(id)
  if (!h || paused.has(id)) return
  paused.add(id)
  try { h.pause() } catch { /* keep globe */ }
}

function resumeHandle(id: string): void {
  const h = handles.get(id)
  if (!h || !paused.has(id)) return
  if (hiddenTab() || webglLost()) return
  paused.delete(id)
  try { h.resume() } catch { /* stay paused */ }
}

export function enforceAnimatedBudget(reason: string): GovernorSnapshot {
  if (hiddenTab() || webglLost()) {
    for (const id of handles.keys()) pauseHandle(id)
    return publishGovernor(reason)
  }
  const heap = readHeap()
  const pressure = pressureOf(heap.usedMb, heap.limitMb)
  const running = [...handles.values()]
    .filter((h) => !paused.has(h.id))
    .sort((a, b) => a.registeredAt - b.registeredAt)
  const cap = pressure === "critical" ? 1 : MAX_ANIMATED_DEFAULT
  while (running.length > cap) {
    const oldest = running.shift()
    if (!oldest) break
    pauseHandle(oldest.id)
  }
  if (pressure === "ok") {
    const pausedList = [...handles.values()]
      .filter((h) => paused.has(h.id))
      .sort((a, b) => a.registeredAt - b.registeredAt)
    while ([...handles.values()].filter((h) => !paused.has(h.id)).length < MAX_ANIMATED_DEFAULT) {
      const next = pausedList.shift()
      if (!next) break
      resumeHandle(next.id)
    }
  }
  return publishGovernor(reason)
}

export function registerAnimatedLayer(
  id: string,
  kind: AnimatedLayerKind,
  pause: () => void,
  resume: () => void,
): () => void {
  handles.set(id, { id, kind, pause, resume, registeredAt: Date.now() })
  enforceAnimatedBudget(`register:${id}`)
  return () => {
    handles.delete(id)
    paused.delete(id)
    publishGovernor(`unregister:${id}`)
  }
}

export function isAnimatedPaused(id: string): boolean {
  return paused.has(id) || hiddenTab() || webglLost()
}

export function subscribeGovernor(fn: (snap: GovernorSnapshot) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function bindGovernorLifecycle(): () => void {
  if (typeof window === "undefined") return () => {}
  const onVis = () => enforceAnimatedBudget(document.hidden ? "hidden-tab" : "visible-tab")
  const onLost = () => enforceAnimatedBudget("webgl-lost")
  const onRestored = () => enforceAnimatedBudget("webgl-restored")
  document.addEventListener("visibilitychange", onVis)
  window.addEventListener("crep:webgl-lost", onLost)
  window.addEventListener("crep:webgl-restored", onRestored)
  const pulse = window.setInterval(() => enforceAnimatedBudget("pulse"), 4000)
  enforceAnimatedBudget("bind")
  return () => {
    document.removeEventListener("visibilitychange", onVis)
    window.removeEventListener("crep:webgl-lost", onLost)
    window.removeEventListener("crep:webgl-restored", onRestored)
    window.clearInterval(pulse)
  }
}

export const EARTH_SIM_SAFE_ANIMATED_COUNT = MAX_ANIMATED_DEFAULT
