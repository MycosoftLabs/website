/**
 * SGP4 Satellite Position Propagator — Apr 2026
 *
 * Real-time satellite position propagation using satellite.js (SGP4/SDP4).
 * Converts Keplerian orbital elements from CelesTrak GP data into SatRec objects
 * and propagates positions for any given Date.
 *
 * Usage:
 *   const propagator = new SGP4Propagator()
 *   propagator.loadSatellites(satellites) // from CREP entities
 *   const positions = propagator.propagateAll(new Date())
 */

import * as satellite from "satellite.js"

/** SatRec type inferred from satellite.js twoline2satrec return type */
type SatRec = ReturnType<typeof satellite.twoline2satrec>

// ─── Types ───────────────────────────────────────────────────────────────────

/** Orbital elements as stored in CREP satellite entity properties */
export interface SatelliteOrbitalElements {
  noradId: number
  name?: string
  /** TLE line 1 (if available from TLE API) */
  line1?: string
  /** TLE line 2 (if available from TLE API) */
  line2?: string
  /** Individual Keplerian elements (from CelesTrak GP or parsed TLE) */
  epoch?: string
  meanMotion?: number       // revolutions/day
  eccentricity?: number
  inclination?: number      // degrees
  raAscNode?: number        // degrees
  argPericenter?: number    // degrees
  meanAnomaly?: number      // degrees
  bstar?: number
  meanMotionDot?: number
  intlDesignator?: string
}

/** Propagated position result for a single satellite */
export interface SatellitePosition {
  id: string
  noradId: number
  lat: number
  lng: number
  altitude_km: number
  velocity_km_s: number
}

// ─── TLE Construction ────────────────────────────────────────────────────────

/**
 * Build TLE line1 and line2 from individual GP (General Perturbations) elements.
 * This is needed because CelesTrak GP data provides individual fields, not TLE strings.
 *
 * TLE format reference: https://celestrak.org/NORAD/elements/table.php
 */
function buildTLEFromGP(gp: {
  noradId: number
  epoch: string
  bstar: number
  meanMotionDot: number
  meanMotion: number
  eccentricity: number
  inclination: number
  raAscNode: number
  argPericenter: number
  meanAnomaly: number
  intlDesignator?: string
}): { line1: string; line2: string } {
  // Parse epoch into TLE epoch format: YYDDD.DDDDDDDD
  const epochDate = new Date(gp.epoch)
  const year = epochDate.getUTCFullYear()
  const yy = year % 100
  const startOfYear = new Date(Date.UTC(year, 0, 1))
  const dayOfYear =
    (epochDate.getTime() - startOfYear.getTime()) / 86400000 + 1
  const epochStr = `${String(yy).padStart(2, "0")}${dayOfYear.toFixed(8).padStart(12, "0")}`

  // Format NORAD ID (5 digits)
  const noradStr = String(gp.noradId).padStart(5, "0")

  // Format international designator (8 chars, right-padded)
  const intlDes = (gp.intlDesignator || "00000A").padEnd(8, " ")

  // Format mean motion dot (first derivative / 2)
  const mmdot = gp.meanMotionDot
  let mmdotStr: string
  if (mmdot === 0) {
    mmdotStr = " .00000000"
  } else {
    const sign = mmdot < 0 ? "-" : " "
    mmdotStr = sign + Math.abs(mmdot).toFixed(8).substring(1)
  }

  // Format BSTAR drag coefficient in TLE exponential notation
  function formatExponential(val: number): string {
    if (val === 0) return " 00000-0"
    const sign = val < 0 ? "-" : " "
    const abs = Math.abs(val)
    const exp = Math.floor(Math.log10(abs))
    const mantissa = abs / Math.pow(10, exp)
    const mantissaStr = Math.round(mantissa * 100000)
      .toString()
      .padStart(5, "0")
    const expSign = exp < 0 ? "-" : "+"
    const expStr = Math.abs(exp).toString()
    return `${sign}${mantissaStr}${expSign}${expStr}`
  }

  const bstarStr = formatExponential(gp.bstar)

  // Line 1: columns are 1-indexed in the spec
  // Format: 1 NNNNN C YYDDD.DDDDDDDD  .DDDDDDDD  00000-0  BSTAR 0  999
  const line1Raw = `1 ${noradStr}U ${intlDes}${epochStr}${mmdotStr}  00000-0 ${bstarStr} 0  999`

  // Compute checksum for line 1
  const cksum1 = tleChecksum(line1Raw)
  const line1 = line1Raw + cksum1

  // Line 2
  const incStr = gp.inclination.toFixed(4).padStart(8, " ")
  const raanStr = gp.raAscNode.toFixed(4).padStart(8, " ")
  // Eccentricity: 7 digits after decimal, no leading "0."
  const eccStr = gp.eccentricity
    .toFixed(7)
    .substring(2) // remove "0."
  const argpStr = gp.argPericenter.toFixed(4).padStart(8, " ")
  const maStr = gp.meanAnomaly.toFixed(4).padStart(8, " ")
  const mmStr = gp.meanMotion.toFixed(8).padStart(11, " ")
  const revStr = "    0" // revolution number at epoch, not critical for propagation

  const line2Raw = `2 ${noradStr} ${incStr} ${raanStr} ${eccStr} ${argpStr} ${maStr} ${mmStr}${revStr}`

  const cksum2 = tleChecksum(line2Raw)
  const line2 = line2Raw + cksum2

  return { line1, line2 }
}

/** Compute TLE line checksum (modulo 10 of sum of digits, with '-' counting as 1) */
function tleChecksum(line: string): string {
  let sum = 0
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c >= "0" && c <= "9") sum += parseInt(c)
    else if (c === "-") sum += 1
  }
  return String(sum % 10)
}

// ─── Propagator ──────────────────────────────────────────────────────────────

export class SGP4Propagator {
  /** Cached SatRec objects keyed by entity ID (e.g. "sat_25544") */
  private satrecCache = new Map<string, SatRec>()
  /** NORAD ID lookup keyed by entity ID */
  private noradIdMap = new Map<string, number>()

  /**
   * Load satellites and build SatRec objects.
   * Caches SatRec objects so they only need to be built once per satellite.
   * Call again with new satellites to add them; existing ones are preserved.
   */
  loadSatellites(satellites: Array<{ id: string; properties?: Record<string, any> }>): number {
    let loaded = 0

    for (const sat of satellites) {
      // Skip if already cached
      if (this.satrecCache.has(sat.id)) {
        loaded++
        continue
      }

      const props = sat.properties || {}
      const elements = extractOrbitalElements(sat.id, props)
      if (!elements) continue

      try {
        let satrec: SatRec | null = null

        // Prefer raw TLE lines if available (most accurate)
        if (elements.line1 && elements.line2) {
          satrec = satellite.twoline2satrec(elements.line1, elements.line2)
        }
        // Otherwise build TLE lines from individual elements
        else if (
          elements.epoch &&
          typeof elements.meanMotion === "number" &&
          typeof elements.eccentricity === "number" &&
          typeof elements.inclination === "number" &&
          typeof elements.raAscNode === "number" &&
          typeof elements.argPericenter === "number" &&
          typeof elements.meanAnomaly === "number"
        ) {
          const { line1, line2 } = buildTLEFromGP({
            noradId: elements.noradId,
            epoch: elements.epoch,
            bstar: elements.bstar ?? 0,
            meanMotionDot: elements.meanMotionDot ?? 0,
            meanMotion: elements.meanMotion,
            eccentricity: elements.eccentricity,
            inclination: elements.inclination,
            raAscNode: elements.raAscNode,
            argPericenter: elements.argPericenter,
            meanAnomaly: elements.meanAnomaly,
            intlDesignator: elements.intlDesignator,
          })
          satrec = satellite.twoline2satrec(line1, line2)
        }

        if (satrec) {
          this.satrecCache.set(sat.id, satrec)
          this.noradIdMap.set(sat.id, elements.noradId)
          loaded++
        }
      } catch (err) {
        // SGP4 init can fail for some debris/decayed objects — skip silently
      }
    }

    return loaded
  }

  /**
   * Propagate all loaded satellites to the given date.
   * Returns an array of positions with lat/lng/alt/velocity.
   */
  propagateAll(date: Date): SatellitePosition[] {
    const positions: SatellitePosition[] = []
    const gmst = satellite.gstime(date)

    for (const [id, satrec] of this.satrecCache) {
      try {
        const pv = satellite.propagate(satrec, date)
        const positionEci = pv.position
        const velocityEci = pv.velocity

        // propagate returns false on error
        if (
          typeof positionEci === "boolean" ||
          !positionEci ||
          typeof velocityEci === "boolean" ||
          !velocityEci
        ) {
          continue
        }

        const geo = satellite.eciToGeodetic(positionEci, gmst)
        const lat = satellite.radiansToDegrees(geo.latitude)
        const lng = satellite.radiansToDegrees(geo.longitude)
        const altitude_km = geo.height

        const velocity_km_s = Math.sqrt(
          velocityEci.x * velocityEci.x +
          velocityEci.y * velocityEci.y +
          velocityEci.z * velocityEci.z
        )

        // Sanity check — skip NaN or underground positions
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          !Number.isFinite(altitude_km) ||
          altitude_km < 0
        ) {
          continue
        }

        positions.push({
          id,
          noradId: this.noradIdMap.get(id) ?? 0,
          lat,
          lng,
          altitude_km,
          velocity_km_s,
        })
      } catch {
        // Propagation can fail for decayed/invalid orbits — skip
      }
    }

    return positions
  }

  /**
   * Propagate a single satellite to generate an orbit path.
   * Returns an array of [lng, lat] coordinate pairs for the next `minutes` minutes.
   *
   * @param id Entity ID (e.g. "sat_25544")
   * @param startDate Start time for the path
   * @param minutes Duration of path in minutes (default: 90 = ~1 orbit for LEO)
   * @param stepMinutes Time step between points (default: 1 minute)
   */
  propagateOrbitPath(
    id: string,
    startDate: Date,
    minutes = 90,
    stepMinutes = 1
  ): [number, number][] | null {
    const satrec = this.satrecCache.get(id)
    if (!satrec) return null

    const points: [number, number][] = []
    const steps = Math.ceil(minutes / stepMinutes)

    for (let i = 0; i <= steps; i++) {
      const t = new Date(startDate.getTime() + i * stepMinutes * 60000)
      try {
        const pv = satellite.propagate(satrec, t)
        const posEci = pv.position
        if (typeof posEci === "boolean" || !posEci) continue

        const gmst = satellite.gstime(t)
        const geo = satellite.eciToGeodetic(posEci, gmst)
        const lat = satellite.radiansToDegrees(geo.latitude)
        const lng = satellite.radiansToDegrees(geo.longitude)

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          points.push([lng, lat])
        }
      } catch {
        // Skip invalid points
      }
    }

    return points.length > 2 ? points : null
  }

  /** Number of loaded satellites */
  get size(): number {
    return this.satrecCache.size
  }

  /** Remove a satellite from the cache */
  remove(id: string): void {
    this.satrecCache.delete(id)
    this.noradIdMap.delete(id)
  }

  /** Clear all cached satellites */
  clear(): void {
    this.satrecCache.clear()
    this.noradIdMap.clear()
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract orbital elements from a CREP satellite entity's properties.
 * Handles both TLE API format (has line1/line2) and CelesTrak GP format (individual elements).
 */
function extractOrbitalElements(
  entityId: string,
  props: Record<string, any>
): SatelliteOrbitalElements | null {
  const noradId = props.noradId ?? props.norad_id ?? props.NORAD_CAT_ID
  if (typeof noradId !== "number" || noradId <= 0) return null

  return {
    noradId,
    name: props.name || props.OBJECT_NAME,
    line1: props.line1 || props.tle1,
    line2: props.line2 || props.tle2,
    epoch: props.epoch || props.EPOCH,
    meanMotion: props.meanMotion ?? props.MEAN_MOTION,
    eccentricity: props.eccentricity ?? props.ECCENTRICITY,
    inclination: props.inclination ?? props.INCLINATION,
    raAscNode: props.raAscNode ?? props.RA_OF_ASC_NODE,
    argPericenter: props.argPericenter ?? props.ARG_OF_PERICENTER,
    meanAnomaly: props.meanAnomaly ?? props.MEAN_ANOMALY,
    bstar: props.bstar ?? props.BSTAR,
    meanMotionDot: props.meanMotionDot ?? props.MEAN_MOTION_DOT,
    intlDesignator: props.intlDesignator ?? props.OBJECT_ID,
  }
}
