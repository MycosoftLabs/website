/**
 * OEI Sun ↔ Earth Correlation — live solar events mapped to terrestrial impact.
 *
 * Fuses:
 *   - NOAA SWPC Solar Region Summary (active sunspots, daily)
 *   - NOAA SWPC GOES X-ray flare list (last 24 h flares)
 *   - NASA DONKI CME catalog (Earth-impact predictions + arrival times)
 *   - NOAA SWPC Ovation aurora model (current auroral oval brightness)
 *   - NOAA NHC + JTWC active tropical cyclones
 *
 * Returns earthspots (points + footprints on Earth), plus inert correlation
 * lines from complex active regions to active tropical cyclones (labelled
 * "hypothesis — active research," per Elsner/Lei references).
 *
 * Cached for 60 s — upstream updates at minute granularity at most.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getSubsolarPoint, getDaysideFootprint, getAuroralOval,
  flareToEarthspot, cmeToEarthspots, makeSunstormCorrelationLines,
  type EarthSpot, type SolarFlare, type CME, type SunspotRegion, type TropicalCyclone,
} from "@/lib/crep/sun-earth-correlation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 60

// ─── Source fetchers ─────────────────────────────────────────────────────────

async function fetchSolarRegions(): Promise<SunspotRegion[]> {
  try {
    const res = await fetch("https://services.swpc.noaa.gov/json/solar_regions.json", {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "MycosoftCREP/1.0 (sun-earth)" },
    })
    if (!res.ok) return []
    const arr = await res.json() as any[]
    return arr.map((r: any) => ({
      region: String(r.region),
      hel_lat: r.latitude ?? 0,
      hel_lon: r.longitude ?? 0,
      area: r.area ?? 0,
      magClass: r.mag_class,
      sunspotCount: r.spotclass ? 0 : r.number_spots,
      carringtonLongitude: r.carrington_longitude,
      observedDate: r.observed_date,
    }))
  } catch { return [] }
}

async function fetchFlares(): Promise<SolarFlare[]> {
  try {
    const res = await fetch("https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json", {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "MycosoftCREP/1.0" },
    })
    if (!res.ok) return []
    const arr = await res.json() as any[]
    return arr.map((f: any) => ({
      classType: f.max_class || f.class_type,
      peakFlux: f.max_xrlong,
      beginTime: f.begin_time,
      peakTime: f.max_time,
      endTime: f.end_time,
      sourceRegion: f.noaa_scales || f.location,
    }))
  } catch { return [] }
}

async function fetchCMEs(): Promise<CME[]> {
  try {
    // DONKI is preferred for CMEs with impact predictions
    const since = new Date(Date.now() - 72 * 3600 * 1000).toISOString().slice(0, 10)
    const key = process.env.NASA_API_KEY || "DEMO_KEY"
    const res = await fetch(`https://api.nasa.gov/DONKI/CMEAnalysis?startDate=${since}&mostAccurateOnly=true&api_key=${key}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const arr = await res.json() as any[]
    return arr.map((c: any) => ({
      activityID: c.activityID || c.associatedCMEID,
      startTime: c.time21_5 || c.startTime,
      sourceLocation: c.sourceLocation,
      speed_km_s: c.speed,
      halfAngle_deg: c.halfAngle,
      arrivalTimePredicted: c.enlilList?.[0]?.estimatedShockArrivalTime,
      predictedEarthImpact: !!c.enlilList?.[0]?.isEarthGB,
      associatedFlare: c.associatedCMEID,
      kpPredicted: c.enlilList?.[0]?.kp_90,
    }))
  } catch { return [] }
}

async function fetchNHCCyclones(): Promise<TropicalCyclone[]> {
  const cyclones: TropicalCyclone[] = []
  try {
    const res = await fetch("https://www.nhc.noaa.gov/CurrentStorms.json", {
      signal: AbortSignal.timeout(8_000),
    })
    if (res.ok) {
      const j = await res.json()
      for (const s of j.activeStorms || []) {
        const basin = s.binNumber?.startsWith("AT") ? "atlantic" : "e-pacific" as const
        cyclones.push({
          id: `nhc-${s.id}`,
          name: s.name,
          basin: basin as any,
          lat: parseFloat(s.latitudeNumeric || s.latitude),
          lng: parseFloat(s.longitudeNumeric || s.longitude),
          intensity_kts: parseInt(s.intensity) || 0,
          pressure_mb: parseInt(s.pressure) || undefined,
          category: s.classification || "TD",
          movement: { speed_kts: parseInt(s.movementSpeed) || 0, heading_deg: parseInt(s.movementDir) || 0 },
          lastUpdate: s.lastUpdate,
        })
      }
    }
  } catch { /* ignore */ }
  return cyclones
}

async function fetchAuroraOvation(): Promise<{ northPower: number; southPower: number }> {
  try {
    const res = await fetch("https://services.swpc.noaa.gov/json/ovation_aurora_latest.json", {
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return { northPower: 0, southPower: 0 }
    const j = await res.json() as any
    return { northPower: j["Hemispheric Power (GW)"]?.North ?? 0, southPower: j["Hemispheric Power (GW)"]?.South ?? 0 }
  } catch { return { northPower: 0, southPower: 0 } }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const [regions, flares, cmes, cyclones, ovation] = await Promise.all([
    fetchSolarRegions(), fetchFlares(), fetchCMEs(), fetchNHCCyclones(), fetchAuroraOvation(),
  ])

  const subsolar = getSubsolarPoint()
  const earthspots: EarthSpot[] = []

  // 1) Subsolar "earthspot" always present
  earthspots.push({
    id: "subsolar", kind: "sub-solar",
    lat: subsolar.lat, lng: subsolar.lng,
    footprint: getDaysideFootprint(subsolar),
    intensity: 0.35,
    label: `Subsolar point (Sun directly overhead)`,
    timestamp: new Date().toISOString(),
  })

  // 2) Flares from the last ~6 hours → dayside footprints
  const sixHoursAgo = Date.now() - 6 * 3600 * 1000
  for (const f of flares) {
    if (new Date(f.peakTime || f.beginTime).getTime() < sixHoursAgo) continue
    earthspots.push(flareToEarthspot(f, subsolar))
  }

  // 3) CMEs with predicted Earth impact → arrival-point + auroral ovals
  for (const c of cmes) {
    earthspots.push(...cmeToEarthspots(c))
  }

  // 4) Baseline auroral ovals driven by current Ovation power
  const ovPowerN = ovation.northPower
  const ovPowerS = ovation.southPower
  if (ovPowerN > 0) {
    // Map hemispheric power (GW) → invariant latitude roughly
    // (quiet=15GW→72°, moderate=60GW→65°, strong=150GW→55°)
    const invLat = Math.max(50, 72 - (ovPowerN / 10))
    earthspots.push({
      id: "aurora-baseline-N", kind: "aurora-oval-north",
      lat: invLat, lng: 0, footprint: getAuroralOval("north", invLat),
      intensity: Math.min(1, ovPowerN / 150),
      label: `Northern aurora oval (${ovPowerN.toFixed(0)} GW)`,
      timestamp: new Date().toISOString(),
    })
  }
  if (ovPowerS > 0) {
    const invLat = Math.max(50, 72 - (ovPowerS / 10))
    earthspots.push({
      id: "aurora-baseline-S", kind: "aurora-oval-south",
      lat: -invLat, lng: 0, footprint: getAuroralOval("south", invLat),
      intensity: Math.min(1, ovPowerS / 150),
      label: `Southern aurora oval (${ovPowerS.toFixed(0)} GW)`,
      timestamp: new Date().toISOString(),
    })
  }

  // 5) Correlation lines — hypothesis overlay
  const correlationLines = makeSunstormCorrelationLines(regions, cyclones, subsolar)

  return NextResponse.json({
    source: "sun-earth-correlation",
    subsolar,
    sunspotRegions: regions,
    flares: flares.slice(0, 200),
    cmes,
    cyclones,
    ovation,
    earthspots,
    correlationLines,
    correlationLinesDisclaimer:
      "Correlation lines are a visualisation of the Elsner/Jagger/Lei hypothesis linking " +
      "solar activity to tropical-cyclone intensity. The hypothesis is not consensus; " +
      "the lines are exploratory, never predictive.",
    generatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } })
}
