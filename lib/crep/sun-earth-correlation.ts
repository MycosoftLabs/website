/**
 * Sun ↔ Earth Correlation Engine
 *
 * Takes live solar data (sunspots, flares, CMEs) and maps each event to
 * its corresponding terrestrial "earthspot" — the spatial region on Earth
 * where the event's energy is coupling into the atmosphere / magnetosphere
 * right now. Enables rendering of:
 *
 *   • Sunspot → subsolar earthspot (point on Earth directly under the Sun,
 *     which moves as Earth rotates). The sub-solar latitude is set by the
 *     Sun's declination, the longitude by solar time.
 *   • Solar flare (M-class / X-class) → Earth dayside footprint where the
 *     X-ray / EUV burst is hitting the thermosphere right now. Footprint
 *     is the great-circle hemisphere centered on the subsolar point.
 *   • CME → predicted arrival hemisphere + polar-oval auroral-impact zones.
 *     Arrival window from NOAA SWPC WSA-Enlil forecast.
 *   • Proton event / geomagnetic storm → polar cap absorption ovals.
 *
 * For scientific + visual (NOT predictive claims) correlation between
 * solar activity and tropical-cyclone intensity, we draw inert lines
 * between each active cyclone's eye and the day's dominant active region.
 * This is exploratory — the hypothesis that storms correlate with solar
 * flux is published but not accepted consensus. Label as "correlation
 * overlay (hypothesis)" in the UI.
 *
 * Sources (all public, no auth):
 *   - NOAA SWPC Solar Region Summary (daily active regions with lat/lon)
 *     https://services.swpc.noaa.gov/json/solar_regions.json
 *   - NOAA SWPC GOES X-ray flare list
 *     https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json
 *   - NOAA SWPC DONKI CMEs (arrival predictions)
 *     https://api.nasa.gov/DONKI/CMEAnalysis?api_key=DEMO_KEY
 *   - NOAA SWPC auroral oval current model
 *     https://services.swpc.noaa.gov/json/ovation_aurora_latest.json
 *   - NOAA NHC active tropical cyclones
 *     https://www.nhc.noaa.gov/CurrentStorms.json
 *   - JTWC (Pacific/Indian Ocean Western basin)
 *     https://www.metoc.navy.mil/jtwc/rss/jtwc.rss
 */

export interface SunspotRegion {
  region: string            // NOAA AR number (e.g. "3500")
  hel_lat: number           // Heliographic latitude (degrees, + = N)
  hel_lon: number           // Heliographic longitude (degrees)
  area: number              // millionths of solar disk
  magClass?: string         // α, β, βγ, βγδ (Hale/Mt-Wilson)
  sunspotCount?: number
  carringtonLongitude?: number
  observedDate: string
}

export interface SolarFlare {
  classType: "A" | "B" | "C" | "M" | "X" | string
  peakFlux?: number
  beginTime: string
  peakTime: string
  endTime?: string
  sourceRegion?: string    // AR number
  location?: { hel_lat: number; hel_lon: number }
}

export interface CME {
  activityID: string
  startTime: string
  sourceLocation?: string   // "N15W20" style
  speed_km_s?: number
  halfAngle_deg?: number
  arrivalTimePredicted?: string
  predictedEarthImpact: boolean
  associatedFlare?: string
  kpPredicted?: number      // Geomagnetic response
}

export interface TropicalCyclone {
  id: string
  name: string
  basin: "atlantic" | "e-pacific" | "w-pacific" | "n-indian" | "s-indian" | "s-pacific"
  lat: number
  lng: number
  intensity_kts: number
  pressure_mb?: number
  category?: "TD" | "TS" | "H1" | "H2" | "H3" | "H4" | "H5" | "TY" | "STY" | string
  movement?: { speed_kts: number; heading_deg: number }
  lastUpdate: string
}

export interface EarthSpot {
  /** Unique ID for a given moment in time */
  id: string
  /** Origin on the Sun (if traceable) */
  sourceRegion?: string
  /** Kind of solar event coupling in */
  kind: "sub-solar" | "flare-dayside" | "cme-arrival" | "proton-event" | "geomagnetic-storm" | "aurora-oval-north" | "aurora-oval-south"
  /** Point on Earth most directly affected now (degrees) */
  lat: number
  lng: number
  /** Optional footprint polygon (GeoJSON ring) */
  footprint?: [number, number][]
  /** "Now" radial intensity (0–1) used for opacity/size on map */
  intensity: number
  /** Human label */
  label: string
  /** ISO-8601 timestamp of the coupling moment */
  timestamp: string
}

// ─── Math helpers ────────────────────────────────────────────────────────────

/**
 * Compute the sub-solar point — the lat/lng on Earth where the Sun is
 * directly overhead right now. Based on solar declination + equation of time.
 *
 * This is the bullseye of every solar-EUV/X-ray event; the dayside hemisphere
 * around this point is what actually gets hit by a flare in real time.
 */
export function getSubsolarPoint(atIso?: string): { lat: number; lng: number } {
  const now = atIso ? new Date(atIso) : new Date()
  // Julian century
  const jd = now.getTime() / 86_400_000 + 2_440_587.5
  const T = (jd - 2_451_545.0) / 36_525
  // Mean longitude + anomaly of the Sun (NOAA solar position algorithm, low-precision)
  const L0 = ((280.46646 + 36_000.76983 * T + 0.0003032 * T * T) % 360 + 360) % 360
  const M = 357.52911 + 35_999.05029 * T - 0.0001537 * T * T
  const Mrad = (M * Math.PI) / 180
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad)
  const trueLong = L0 + C
  const Omega = 125.04 - 1934.136 * T
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin((Omega * Math.PI) / 180)
  const epsilon0 = 23 + (26 + (21.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T) / 60) / 60
  const epsilon = epsilon0 + 0.00256 * Math.cos((Omega * Math.PI) / 180)
  const lat = (Math.asin(Math.sin((epsilon * Math.PI) / 180) * Math.sin((lambda * Math.PI) / 180)) * 180) / Math.PI
  // Longitude of subsolar point = 180° − (GMST + right-ascension correction).
  // For visualisation we use the simpler form: subsolar lng = −15 × (UTC hours − 12)
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600
  let lng = -15 * (utcH - 12)
  // Equation of time correction, approximate (≤ ±16 min → ±4°)
  const eot = -7.5 * Math.sin((2 * Mrad))
  lng += eot
  // Wrap to [-180, 180]
  lng = ((lng + 540) % 360) - 180
  return { lat, lng }
}

/**
 * Compute the dayside hemisphere polygon around the subsolar point.
 * Returns a ring of ~72 points on the terminator great-circle. Used as
 * the "flare footprint" — everywhere inside this ring is being irradiated
 * by the Sun right now.
 */
export function getDaysideFootprint(subsolar: { lat: number; lng: number }): [number, number][] {
  const ring: [number, number][] = []
  const subLat = (subsolar.lat * Math.PI) / 180
  const subLng = (subsolar.lng * Math.PI) / 180
  // Points on a great circle 90° from the subsolar point = terminator.
  // Walk azimuths 0..360 from the subsolar origin at angular distance 90°.
  for (let az = 0; az <= 360; az += 5) {
    const azRad = (az * Math.PI) / 180
    // Angular distance = pi/2
    const ad = Math.PI / 2
    const lat2 = Math.asin(Math.sin(subLat) * Math.cos(ad) + Math.cos(subLat) * Math.sin(ad) * Math.cos(azRad))
    const lng2 = subLng + Math.atan2(
      Math.sin(azRad) * Math.sin(ad) * Math.cos(subLat),
      Math.cos(ad) - Math.sin(subLat) * Math.sin(lat2),
    )
    let lng = (lng2 * 180) / Math.PI
    lng = ((lng + 540) % 360) - 180
    ring.push([lng, (lat2 * 180) / Math.PI])
  }
  return ring
}

/**
 * Auroral-oval ring at magnetic invariant latitude `theta` (typically
 * 65–72°N for auroras during mild storms, lower during strong ones).
 * Returns a lat/lng ring on Earth. Rough (IGRF-independent, magnetic pole
 * approximated via current location ~80°N 72°W for 2026).
 */
export function getAuroralOval(hemisphere: "north" | "south", invariantLat: number): [number, number][] {
  const poleLat = hemisphere === "north" ? 80.7 : -80.7
  const poleLng = hemisphere === "north" ? -72.0 : 108.0
  const pLatRad = (poleLat * Math.PI) / 180
  const pLngRad = (poleLng * Math.PI) / 180
  const ad = ((90 - invariantLat) * Math.PI) / 180
  const ring: [number, number][] = []
  for (let az = 0; az <= 360; az += 5) {
    const azRad = (az * Math.PI) / 180
    const lat = Math.asin(Math.sin(pLatRad) * Math.cos(ad) + Math.cos(pLatRad) * Math.sin(ad) * Math.cos(azRad))
    const lng = pLngRad + Math.atan2(
      Math.sin(azRad) * Math.sin(ad) * Math.cos(pLatRad),
      Math.cos(ad) - Math.sin(pLatRad) * Math.sin(lat),
    )
    let lngD = (lng * 180) / Math.PI
    lngD = ((lngD + 540) % 360) - 180
    ring.push([lngD, (lat * 180) / Math.PI])
  }
  return ring
}

/**
 * Given a live solar flare and the current subsolar point, return the
 * "earthspot" representing its immediate impact footprint.
 * Class M flares raise the ionosphere D-layer → radio blackouts on the
 * lit side; X-class can cause full shortwave fadeout.
 */
export function flareToEarthspot(flare: SolarFlare, subsolar: { lat: number; lng: number }): EarthSpot {
  const classLetter = flare.classType.charAt(0)
  const classNum = parseFloat(flare.classType.slice(1)) || 1
  const intensity = classLetter === "X" ? Math.min(1, 0.6 + 0.08 * classNum)
                  : classLetter === "M" ? Math.min(1, 0.3 + 0.03 * classNum)
                  : classLetter === "C" ? 0.15 : 0.05
  return {
    id: `flare-${flare.beginTime}`,
    sourceRegion: flare.sourceRegion,
    kind: "flare-dayside",
    lat: subsolar.lat, lng: subsolar.lng,
    footprint: getDaysideFootprint(subsolar),
    intensity, label: `${flare.classType} flare` + (flare.sourceRegion ? ` from AR${flare.sourceRegion}` : ""),
    timestamp: flare.peakTime || flare.beginTime,
  }
}

/**
 * Given a CME with NOAA predicted arrival time, return earthspots for
 * (a) the magnetopause impact center (subsolar point at arrival time)
 * (b) the north + south auroral ovals expanded to lower-than-normal
 *     latitudes based on predicted Kp.
 */
export function cmeToEarthspots(cme: CME): EarthSpot[] {
  if (!cme.predictedEarthImpact || !cme.arrivalTimePredicted) return []
  const arrivalSS = getSubsolarPoint(cme.arrivalTimePredicted)
  const kp = cme.kpPredicted ?? 5
  // Auroral oval equatorward boundary (rough rule): ~72° at Kp 0, ~55° at Kp 9
  const invariantLat = Math.max(50, 72 - (kp * 2))
  const intensity = Math.min(1, kp / 9)
  return [
    {
      id: `cme-${cme.activityID}-impact`,
      sourceRegion: cme.associatedFlare,
      kind: "cme-arrival",
      lat: arrivalSS.lat, lng: arrivalSS.lng,
      footprint: getDaysideFootprint(arrivalSS),
      intensity,
      label: `CME arrival (${cme.speed_km_s ?? "?"} km/s, Kp ${kp})`,
      timestamp: cme.arrivalTimePredicted,
    },
    {
      id: `cme-${cme.activityID}-aurora-N`,
      sourceRegion: cme.associatedFlare,
      kind: "aurora-oval-north",
      lat: invariantLat, lng: 0,
      footprint: getAuroralOval("north", invariantLat),
      intensity,
      label: `Northern auroral oval (${invariantLat.toFixed(0)}° inv. lat)`,
      timestamp: cme.arrivalTimePredicted,
    },
    {
      id: `cme-${cme.activityID}-aurora-S`,
      sourceRegion: cme.associatedFlare,
      kind: "aurora-oval-south",
      lat: -invariantLat, lng: 0,
      footprint: getAuroralOval("south", invariantLat),
      intensity,
      label: `Southern auroral oval (${invariantLat.toFixed(0)}° inv. lat)`,
      timestamp: cme.arrivalTimePredicted,
    },
  ]
}

/**
 * Correlation line from an active sunspot region to each active tropical
 * cyclone. Clearly labelled "hypothesis — active research." Earth-end
 * anchors at each cyclone eye; Sun-end anchors at the AR's subsolar
 * projection at the moment this was computed.
 *
 * Research references (for widget hover explainer):
 *   - Elsner & Jagger 2008 ("Hurricane intensity and solar activity")
 *   - Lei et al. 2023 ("Solar forcing of tropical cyclone frequency")
 *   - not consensus; visualization only.
 */
export interface SunStormCorrelationLine {
  id: string
  solarRegion: string
  cycloneId: string
  sunspotProjection: { lat: number; lng: number }
  cycloneLocation: { lat: number; lng: number }
  daysSinceFlare?: number
  correlationHypothesis: "active-exploration"
}

export function makeSunstormCorrelationLines(
  regions: SunspotRegion[],
  cyclones: TropicalCyclone[],
  subsolar: { lat: number; lng: number },
): SunStormCorrelationLine[] {
  const lines: SunStormCorrelationLine[] = []
  // Only draw from the most magnetically complex active regions
  const complexRegions = regions
    .filter((r) => r.magClass && /β[γδ]|γδ/.test(r.magClass))
    .slice(0, 5)
  for (const r of complexRegions) {
    // Project the AR to its current "ground" on Earth: same hel_lat ≈ sub-AR
    // lat on Earth (rough — ignores B0 angle tilt); longitude = subsolar
    // plus central-meridian distance divided by solar-rotation rate.
    const sunspotEarthLat = r.hel_lat
    const sunspotEarthLng = subsolar.lng + (r.hel_lon * 0.5)
    for (const c of cyclones) {
      lines.push({
        id: `corr-${r.region}-${c.id}`,
        solarRegion: r.region,
        cycloneId: c.id,
        sunspotProjection: { lat: sunspotEarthLat, lng: ((sunspotEarthLng + 540) % 360) - 180 },
        cycloneLocation: { lat: c.lat, lng: c.lng },
        correlationHypothesis: "active-exploration",
      })
    }
  }
  return lines
}
