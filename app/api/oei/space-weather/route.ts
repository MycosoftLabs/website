/**
 * Space Weather API Route - Feb 18, 2026
 * 
 * GET /api/oei/space-weather - Fetch current space weather conditions from NOAA SWPC
 * 
 * Query params:
 * - type: "conditions" | "events" (default: conditions)
 * - refresh: Force cache refresh
 * 
 * Data sources:
 * - noaa-scales.json (R/S/G scales) - returns OBJECT not array, key "-1" = current
 * - plasma-7-day.json (solar wind) - returns array-of-arrays, row[0] is header
 * - mag-7-day.json (magnetic field) - returns array-of-arrays, row[0] is header
 * - noaa-planetary-k-index.json (KP index) - returns array-of-arrays, row[0] is header
 * - 10cm-flux-30-day.json (F10.7 flux) - returns array-of-arrays, row[0] is header
 * 
 * Results cached for 2 minutes to prevent overwhelming the dev server
 */

import { NextResponse } from "next/server"
import { getSpaceWeatherClient } from "@/lib/oei/connectors"

// In-memory cache
interface CacheEntry {
  data: unknown
  timestamp: number
  expiresAt: number
}

const spaceWeatherCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 120_000 // 2 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "conditions"
  const forceRefresh = searchParams.get("refresh") === "true"
  
  const cacheKey = `space-weather-${type}`
  const now = Date.now()
  
  // Check cache first
  const cached = spaceWeatherCache.get(cacheKey)
  if (!forceRefresh && cached && now < cached.expiresAt) {
    console.log(`[SpaceWeather] Cache HIT for "${type}" (${Math.round((cached.expiresAt - now) / 1000)}s remaining)`)
    return NextResponse.json(cached.data)
  }

  try {
    const client = getSpaceWeatherClient()

    if (type === "events") {
      const events = await client.fetchEvents()
      const eventsData = {
        source: "swpc",
        timestamp: new Date().toISOString(),
        total: events.length,
        events,
        available: true,
        cached: false,
      }
      
      spaceWeatherCache.set(cacheKey, {
        data: { ...eventsData, cached: true },
        timestamp: now,
        expiresAt: now + CACHE_TTL_MS,
      })
      console.log(`[SpaceWeather] Cache SET for "${type}" (TTL: ${CACHE_TTL_MS / 1000}s)`)
      
      return NextResponse.json(eventsData)
    }

    // Default: fetch full conditions
    const conditions = await client.fetchConditions()

    const conditionsData = {
      source: "swpc",
      timestamp: new Date().toISOString(),
      conditions,
      available: true,
      cached: false,
      scales: {
        radio: {
          current: conditions.rScale,
          label: `R${conditions.rScale}`,
          description: conditions.rScale === 0
            ? "No radio blackout"
            : `R${conditions.rScale} Radio Blackout`,
        },
        solar: {
          current: conditions.sScale,
          label: `S${conditions.sScale}`,
          description: conditions.sScale === 0
            ? "No solar radiation storm"
            : `S${conditions.sScale} Solar Radiation Storm`,
        },
        geomagnetic: {
          current: conditions.gScale,
          label: `G${conditions.gScale}`,
          description: conditions.gScale === 0
            ? "No geomagnetic storm"
            : `G${conditions.gScale} Geomagnetic Storm`,
        },
      },
      solarWind: {
        speed: conditions.solarWindSpeed,
        speedUnit: "km/s",
        density: conditions.solarWindDensity,
        densityUnit: "p/cm³",
        temperature: conditions.solarWindTemperature,
        temperatureUnit: "K",
      },
      magneticField: {
        bz: conditions.bz,
        bt: conditions.bt,
        unit: "nT",
        stormPotential:
          conditions.bz < -10 ? "High"
          : conditions.bz < -5 ? "Moderate"
          : "Low",
      },
      indices: {
        kpIndex: conditions.kpIndex,
        radioFlux: conditions.radioFlux,
        radioFluxUnit: "SFU",
      },
    }
    
    spaceWeatherCache.set(cacheKey, {
      data: { ...conditionsData, cached: true },
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS,
    })
    console.log(`[SpaceWeather] Cache SET for "${type}" (TTL: ${CACHE_TTL_MS / 1000}s)`)
    
    return NextResponse.json(conditionsData)
  } catch (error) {
    console.error("[API] Space weather error:", error)
    // Graceful fallback - return empty data with 200 to prevent dashboard crashes
    return NextResponse.json({
      error: "Failed to fetch space weather data",
      message: (error as Error).message,
      source: "swpc",
      timestamp: new Date().toISOString(),
      available: false,
      cached: false,
      conditions: null,
      scales: null,
      solarWind: null,
      magneticField: null,
      indices: null,
    })
  }
}
