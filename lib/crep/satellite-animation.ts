/**
 * Satellite Animation Controller — Apr 2026
 *
 * requestAnimationFrame-based animation loop for real-time SGP4 satellite rendering.
 * Runs independently of React state at ~10 FPS, pushing propagated positions
 * directly into MapLibre GeoJSON sources for smooth, glitch-free satellite motion.
 *
 * API:
 *   start(map, satellites)  — Begin animation loop
 *   stop()                  — Stop animation loop
 *   updateSatellites(sats)  — Swap in a new satellite set without restarting
 *
 * Sources updated:
 *   "crep-live-satellites"       — point positions (consumed by existing glow + dot layers)
 *   "crep-live-satellite-orbits" — orbit path lines (thin purple dashed)
 */

import { SGP4Propagator, type SatellitePosition } from "./sgp4-propagator"
import { getSGP4Worker, type WorkerSatInput } from "./sgp4-worker-client"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SatelliteInput {
  id: string
  properties?: Record<string, any>
}

// ─── Animation Controller ────────────────────────────────────────────────────

/** Minimum milliseconds between propagation ticks (~1 FPS for smooth visible movement).
 *  At 10fps satellites appeared to blink/jump because the position deltas were too small
 *  for MapLibre to interpolate visually. At 1fps the movement is clearly directional. */
const TICK_INTERVAL_MS = 1000

/** How often to recalculate orbit paths (every 60s) */
const ORBIT_PATH_INTERVAL_MS = 60000

/** Duration of orbit path prediction in minutes (90 min ~ 1 LEO orbit) */
const ORBIT_PATH_MINUTES = 90

/** Orbit path step size in minutes */
const ORBIT_PATH_STEP_MINUTES = 1

/**
 * Maximum satellites for which we compute orbit paths.
 * Computing paths is more expensive than point propagation, so cap it.
 */
const MAX_ORBIT_PATHS = 200

// Module state — singleton pattern, no React dependency
let animationFrameId: number | null = null
let mapRef: any = null
let propagator: SGP4Propagator | null = null
let lastTickTime = 0
let lastOrbitPathTime = 0
let running = false
let currentSatellites: SatelliteInput[] = []
// Fix E — Apr 18, 2026: SGP4 propagation runs in a Web Worker when available,
// so the main thread stays at 60 FPS even with 15k+ satellites. If the worker
// fails to construct (SSR, strict CSP, old browser), we fall back to the
// main-thread SGP4Propagator below.
let worker: ReturnType<typeof getSGP4Worker> | null = null
let useWorker = false
let workerPropagationInFlight = false
let lastWorkerPositions: SatellitePosition[] = []

// ─── GeoJSON Builders ────────────────────────────────────────────────────────

function positionsToFeatureCollection(positions: SatellitePosition[]) {
  return {
    type: "FeatureCollection" as const,
    features: positions.map((p) => ({
      type: "Feature" as const,
      properties: {
        id: p.id,
        noradId: p.noradId,
        type: "satellite",
        altitude_km: Math.round(p.altitude_km),
        velocity_km_s: Math.round(p.velocity_km_s * 100) / 100,
        name: p.id, // will be overridden by the entity name if available
      },
      geometry: {
        type: "Point" as const,
        coordinates: [p.lng, p.lat],
      },
    })),
  }
}

/**
 * Build orbit paths as a FeatureCollection of LineStrings.
 * Splits paths at the antimeridian (|delta_lng| > 180) to avoid horizontal lines
 * across the map when orbits cross from 180 to -180.
 */
function orbitPathsToFeatureCollection(
  paths: Array<{ id: string; path: [number, number][] }>
) {
  const features: any[] = []

  for (const { id, path } of paths) {
    if (!path || path.length < 2) continue

    // Split at antimeridian crossings
    const segments: [number, number][][] = [[]]
    for (let i = 0; i < path.length; i++) {
      const current = path[i]
      segments[segments.length - 1].push(current)

      if (i < path.length - 1) {
        const next = path[i + 1]
        const deltaLng = Math.abs(next[0] - current[0])
        if (deltaLng > 180) {
          // Start new segment
          segments.push([])
        }
      }
    }

    for (const segment of segments) {
      if (segment.length < 2) continue
      features.push({
        type: "Feature",
        properties: { id, type: "orbit-path" },
        geometry: {
          type: "LineString",
          coordinates: segment,
        },
      })
    }
  }

  return {
    type: "FeatureCollection" as const,
    features,
  }
}

// ─── Animation Loop ──────────────────────────────────────────────────────────

/** The main animation tick, called by requestAnimationFrame */
function tick(timestamp: number) {
  if (!running) return

  // Throttle to the tick interval
  if (timestamp - lastTickTime < TICK_INTERVAL_MS) {
    animationFrameId = requestAnimationFrame(tick)
    return
  }
  lastTickTime = timestamp

  const map = mapRef
  if (!map) {
    animationFrameId = requestAnimationFrame(tick)
    return
  }

  const now = new Date()

  if (useWorker && worker) {
    // Worker path: request propagation off-main-thread. Only fire a new
    // request if the previous one has already returned — prevents queue
    // buildup if the worker briefly lags behind the tick rate.
    if (!workerPropagationInFlight) {
      workerPropagationInFlight = true
      worker.propagate(now).then((positions) => {
        workerPropagationInFlight = false
        // Worker returns the raw SatellitePosition shape (minus 'id: ' prefix logic);
        // coerce id field in case it changed.
        lastWorkerPositions = positions as unknown as SatellitePosition[]
        const satSource = map.getSource?.("crep-live-satellites") as any
        if (satSource?.setData) {
          satSource.setData(positionsToFeatureCollection(lastWorkerPositions))
        }
      }).catch(() => { workerPropagationInFlight = false })
    }
  } else {
    // Fallback: main-thread propagation (original behaviour).
    const prop = propagator
    if (!prop || prop.size === 0) {
      animationFrameId = requestAnimationFrame(tick)
      return
    }
    const positions = prop.propagateAll(now)
    const satSource = map.getSource?.("crep-live-satellites") as any
    if (satSource?.setData) {
      satSource.setData(positionsToFeatureCollection(positions))
    }
    // Orbit paths (only when using main-thread propagator — worker doesn't
    // compute orbit tracks yet; they're recomputed every 60s on main thread
    // anyway so they don't block the render tick.)
    if (timestamp - lastOrbitPathTime > ORBIT_PATH_INTERVAL_MS) {
      lastOrbitPathTime = timestamp
      updateOrbitPaths(prop, now, map)
    }
  }

  // Schedule next frame
  animationFrameId = requestAnimationFrame(tick)
}

/** Compute orbit paths for the top N satellites and push to map */
function updateOrbitPaths(prop: SGP4Propagator, now: Date, map: any) {
  const orbitSource = map.getSource?.("crep-live-satellite-orbits") as any
  if (!orbitSource?.setData) return

  // Only compute paths for a subset to avoid excessive computation
  const satellitesToPath = currentSatellites.slice(0, MAX_ORBIT_PATHS)
  const paths: Array<{ id: string; path: [number, number][] }> = []

  for (const sat of satellitesToPath) {
    const path = prop.propagateOrbitPath(
      sat.id,
      now,
      ORBIT_PATH_MINUTES,
      ORBIT_PATH_STEP_MINUTES
    )
    if (path) {
      paths.push({ id: sat.id, path })
    }
  }

  orbitSource.setData(orbitPathsToFeatureCollection(paths))
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Start the satellite animation loop.
 *
 * @param map MapLibre map instance (must already have "crep-live-satellites" and
 *            "crep-live-satellite-orbits" sources added)
 * @param satellites Array of satellite entities with orbital elements in `properties`
 */
export function startSatelliteAnimation(
  map: any,
  satellites: SatelliteInput[]
): void {
  // Stop any existing animation first
  stopSatelliteAnimation()

  mapRef = map
  currentSatellites = satellites

  // Fix E (Apr 18, 2026): try the Web Worker first. If it's supported we
  // hand the TLEs to the worker and SGP4 math runs off the main thread.
  // If not supported (SSR, strict CSP), fall back to main-thread propagator.
  worker = getSGP4Worker()
  if (worker.isSupported) {
    useWorker = true
    // worker.onReady fires once satellite.js has been imported into the
    // worker scope. We wait for that before sending the load payload so
    // the first propagate() call doesn't race the importScripts.
    const sendLoad = () => {
      if (!worker) return
      const tles: WorkerSatInput[] = satellites
        .map((s) => {
          const p = (s.properties || {}) as any
          const l1 = p.line1 || (s as any).line1
          const l2 = p.line2 || (s as any).line2
          const noradId = p.noradId ?? (s as any).noradId ?? parseInt(String(s.id)) ?? 0
          if (!l1 || !l2) return null
          return { id: String(s.id), noradId, line1: l1, line2: l2 }
        })
        .filter((x): x is WorkerSatInput => x !== null)
      worker.load(tles)
      console.log(`[SatAnim] Started (Worker) — ${tles.length}/${satellites.length} satellites with valid TLEs`)
    }
    if (worker.isReady) sendLoad()
    else worker.onReady(sendLoad)
  } else {
    // Fallback: main-thread propagator
    useWorker = false
    propagator = new SGP4Propagator()
    const loaded = propagator.loadSatellites(satellites)
    console.log(
      `[SatAnim] Started (main-thread fallback) — ${loaded}/${satellites.length} satellites loaded for SGP4 propagation`
    )
  }

  running = true
  lastTickTime = 0
  lastOrbitPathTime = 0
  workerPropagationInFlight = false
  animationFrameId = requestAnimationFrame(tick)
}

/**
 * Stop the satellite animation loop and release resources.
 */
export function stopSatelliteAnimation(): void {
  running = false
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  propagator?.clear()
  propagator = null
  if (worker) {
    try { worker.clear() } catch {}
    // Don't terminate — keep singleton for next start
  }
  useWorker = false
  workerPropagationInFlight = false
  lastWorkerPositions = []
  mapRef = null
  currentSatellites = []
}

/**
 * Update the satellite set without restarting the animation.
 * New satellites are added to the propagator; the animation continues seamlessly.
 */
export function updateSatelliteAnimation(satellites: SatelliteInput[]): void {
  currentSatellites = satellites
  if (useWorker && worker) {
    const tles: WorkerSatInput[] = satellites
      .map((s) => {
        const p = (s.properties || {}) as any
        const l1 = p.line1 || (s as any).line1
        const l2 = p.line2 || (s as any).line2
        const noradId = p.noradId ?? (s as any).noradId ?? parseInt(String(s.id)) ?? 0
        if (!l1 || !l2) return null
        return { id: String(s.id), noradId, line1: l1, line2: l2 }
      })
      .filter((x): x is WorkerSatInput => x !== null)
    worker.load(tles)
    console.log(`[SatAnim] Updated (Worker) — ${tles.length} satellites loaded`)
  } else if (propagator) {
    const loaded = propagator.loadSatellites(satellites)
    if (loaded > 0) {
      console.log(`[SatAnim] Updated (main-thread) — ${propagator.size} satellites loaded`)
    }
  }
}

/**
 * Returns true if the satellite animation loop is currently running.
 */
export function isSatelliteAnimationRunning(): boolean {
  return running
}
