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

  // Throttle to ~10 FPS
  if (timestamp - lastTickTime < TICK_INTERVAL_MS) {
    animationFrameId = requestAnimationFrame(tick)
    return
  }
  lastTickTime = timestamp

  const map = mapRef
  const prop = propagator
  if (!map || !prop || prop.size === 0) {
    animationFrameId = requestAnimationFrame(tick)
    return
  }

  const now = new Date()

  // ── Propagate positions ─────────────────────────────────────────────────
  const positions = prop.propagateAll(now)

  // Push to MapLibre satellite source
  const satSource = map.getSource?.("crep-live-satellites") as any
  if (satSource?.setData) {
    satSource.setData(positionsToFeatureCollection(positions))
  }

  // ── Orbit paths (recalculated periodically, not every frame) ────────────
  if (timestamp - lastOrbitPathTime > ORBIT_PATH_INTERVAL_MS) {
    lastOrbitPathTime = timestamp
    updateOrbitPaths(prop, now, map)
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
  propagator = new SGP4Propagator()

  const loaded = propagator.loadSatellites(satellites)
  console.log(
    `[SatAnim] Started — ${loaded}/${satellites.length} satellites loaded for SGP4 propagation`
  )

  running = true
  lastTickTime = 0
  lastOrbitPathTime = 0
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
  mapRef = null
  currentSatellites = []
}

/**
 * Update the satellite set without restarting the animation.
 * New satellites are added to the propagator; the animation continues seamlessly.
 */
export function updateSatelliteAnimation(satellites: SatelliteInput[]): void {
  currentSatellites = satellites
  if (propagator) {
    const loaded = propagator.loadSatellites(satellites)
    if (loaded > 0) {
      console.log(`[SatAnim] Updated — ${propagator.size} satellites loaded`)
    }
  }
}

/**
 * Returns true if the satellite animation loop is currently running.
 */
export function isSatelliteAnimationRunning(): boolean {
  return running
}
