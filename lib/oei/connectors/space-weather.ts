/**
 * NOAA Space Weather Prediction Center (SWPC) Connector
 * 
 * Fetches real-time space weather data including:
 * - Solar wind conditions
 * - Geomagnetic storm alerts
 * - Solar flare activity
 * - Radio blackout conditions
 * 
 * API Docs: https://services.swpc.noaa.gov/
 */

import type { Event, Provenance } from "@/types/oei"
import { getEventBus } from "../event-bus"

const SWPC_API_BASE = "https://services.swpc.noaa.gov"

// =============================================================================
// TYPES
// =============================================================================

export interface SpaceWeatherConditions {
  // Solar wind
  solarWindSpeed: number        // km/s
  solarWindDensity: number      // protons/cm³
  solarWindTemperature: number  // Kelvin
  
  // Interplanetary Magnetic Field
  bz: number                    // nT (negative = storm potential)
  bt: number                    // nT (total field)
  
  // Activity scales (NOAA scales)
  gScale: number                // Geomagnetic storms (G0-G5)
  sScale: number                // Solar radiation storms (S0-S5)
  rScale: number                // Radio blackouts (R0-R5)
  
  // Additional data
  radioFlux: number             // 10.7cm radio flux (SFU)
  kpIndex: number               // Planetary K-index (0-9)
  sunspotNumber: number         // Daily sunspot number
  
  timestamp: string
}

export interface SolarEvent {
  id: string
  type: "flare" | "cme" | "proton" | "geomagnetic"
  class?: string                // e.g., "X1.5", "M5.2" for flares
  startTime: string
  peakTime?: string
  endTime?: string
  location?: string             // e.g., "N23W45"
  magnitude: number             // 1-5 scale
  description: string
}

interface SWPCScaleData {
  DateStamp: string
  TimeStamp: string
  Scale?: string
  R?: { Scale: number | null; Text: string | null }
  S?: { Scale: number | null; Text: string | null }
  G?: { Scale: number | null; Text: string | null }
}

interface SWPCPlasmaData {
  time_tag: string
  density: number
  speed: number
  temperature: number
}

interface SWPCMagData {
  time_tag: string
  bz_gsm: number
  bt: number
}

// =============================================================================
// HELPERS
// =============================================================================

function getScaleSeverity(scale: number): "info" | "warning" | "severe" | "critical" {
  if (scale >= 4) return "critical"
  if (scale >= 3) return "severe"
  if (scale >= 1) return "warning"
  return "info"
}

function getScaleDescription(type: "R" | "S" | "G", scale: number): string {
  const descriptions: Record<string, Record<number, string>> = {
    R: {
      0: "No radio blackout",
      1: "Minor radio blackout - Brief degradation of HF radio",
      2: "Moderate radio blackout - Limited HF radio blackout",
      3: "Strong radio blackout - Wide area HF blackout",
      4: "Severe radio blackout - HF radio blackout on most of sunlit Earth",
      5: "Extreme radio blackout - Complete HF radio blackout",
    },
    S: {
      0: "No solar radiation storm",
      1: "Minor solar radiation storm - Minor impacts on HF radio in polar regions",
      2: "Moderate solar radiation storm - Small effects on HF radio propagation",
      3: "Strong solar radiation storm - Elevated radiation exposure for polar flights",
      4: "Severe solar radiation storm - Blackout of HF radio through polar regions",
      5: "Extreme solar radiation storm - Complete HF radio blackout in polar regions",
    },
    G: {
      0: "No geomagnetic storm",
      1: "Minor geomagnetic storm - Weak power grid fluctuations",
      2: "Moderate geomagnetic storm - Voltage irregularities at high latitudes",
      3: "Strong geomagnetic storm - Voltage corrections may be required",
      4: "Severe geomagnetic storm - Possible widespread voltage control problems",
      5: "Extreme geomagnetic storm - Widespread voltage control problems",
    },
  }
  return descriptions[type]?.[scale] || `${type}${scale} storm conditions`
}

function spaceWeatherToEvent(conditions: SpaceWeatherConditions): Event[] {
  const events: Event[] = []
  const provenance: Provenance = {
    source: "swpc",
    sourceId: `swpc_${Date.now()}`,
    collectedAt: conditions.timestamp,
    url: "https://www.swpc.noaa.gov/",
    reliability: 1.0,
  }

  // Create event for any elevated conditions
  if (conditions.rScale > 0) {
    events.push({
      id: `swpc_r_${Date.now()}`,
      type: "space_weather",
      subtype: "radio_blackout",
      title: `R${conditions.rScale} Radio Blackout`,
      description: getScaleDescription("R", conditions.rScale),
      severity: getScaleSeverity(conditions.rScale),
      status: "active",
      startedAt: conditions.timestamp,
      provenance,
      properties: {
        scale: conditions.rScale,
        type: "R",
      },
    })
  }

  if (conditions.sScale > 0) {
    events.push({
      id: `swpc_s_${Date.now()}`,
      type: "space_weather",
      subtype: "solar_radiation",
      title: `S${conditions.sScale} Solar Radiation Storm`,
      description: getScaleDescription("S", conditions.sScale),
      severity: getScaleSeverity(conditions.sScale),
      status: "active",
      startedAt: conditions.timestamp,
      provenance,
      properties: {
        scale: conditions.sScale,
        type: "S",
      },
    })
  }

  if (conditions.gScale > 0) {
    events.push({
      id: `swpc_g_${Date.now()}`,
      type: "space_weather",
      subtype: "geomagnetic_storm",
      title: `G${conditions.gScale} Geomagnetic Storm`,
      description: getScaleDescription("G", conditions.gScale),
      severity: getScaleSeverity(conditions.gScale),
      status: "active",
      startedAt: conditions.timestamp,
      provenance,
      properties: {
        scale: conditions.gScale,
        type: "G",
        kpIndex: conditions.kpIndex,
      },
    })
  }

  return events
}

// =============================================================================
// API CLIENT
// =============================================================================

export class SpaceWeatherClient {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map()
  private cacheTTL = 60000 // 1 minute cache

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T
    }
    return null
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * Fetch current NOAA space weather scales
   */
  async fetchCurrentScales(): Promise<{ r: number; s: number; g: number }> {
    const cacheKey = "scales"
    const cached = this.getCached<{ r: number; s: number; g: number }>(cacheKey)
    if (cached) return cached

    try {
      const response = await fetch(
        `${SWPC_API_BASE}/products/noaa-scales.json`,
        { next: { revalidate: 60 } }
      )

      if (!response.ok) {
        throw new Error(`SWPC API error: ${response.status}`)
      }

      const data: SWPCScaleData[] = await response.json()
      
      // Get the most recent data (last entry usually)
      const latest = data[data.length - 1] || data[0]
      
      const result = {
        r: latest.R?.Scale ?? 0,
        s: latest.S?.Scale ?? 0,
        g: latest.G?.Scale ?? 0,
      }

      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("[SWPC] Failed to fetch scales:", error)
      return { r: 0, s: 0, g: 0 }
    }
  }

  /**
   * Fetch real-time solar wind plasma data
   */
  async fetchSolarWindPlasma(): Promise<{ speed: number; density: number; temperature: number }> {
    const cacheKey = "plasma"
    const cached = this.getCached<{ speed: number; density: number; temperature: number }>(cacheKey)
    if (cached) return cached

    try {
      const response = await fetch(
        `${SWPC_API_BASE}/products/solar-wind/plasma-7-day.json`,
        { next: { revalidate: 60 } }
      )

      if (!response.ok) {
        throw new Error(`SWPC API error: ${response.status}`)
      }

      const data: SWPCPlasmaData[] = await response.json()
      
      // Get most recent valid reading
      const validData = data.filter(d => d.speed && d.density)
      const latest = validData[validData.length - 1] || { speed: 0, density: 0, temperature: 0 }
      
      const result = {
        speed: latest.speed,
        density: latest.density,
        temperature: latest.temperature,
      }

      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("[SWPC] Failed to fetch plasma data:", error)
      return { speed: 0, density: 0, temperature: 0 }
    }
  }

  /**
   * Fetch real-time interplanetary magnetic field data
   */
  async fetchMagneticField(): Promise<{ bz: number; bt: number }> {
    const cacheKey = "mag"
    const cached = this.getCached<{ bz: number; bt: number }>(cacheKey)
    if (cached) return cached

    try {
      const response = await fetch(
        `${SWPC_API_BASE}/products/solar-wind/mag-7-day.json`,
        { next: { revalidate: 60 } }
      )

      if (!response.ok) {
        throw new Error(`SWPC API error: ${response.status}`)
      }

      const data: SWPCMagData[] = await response.json()
      
      // Get most recent valid reading
      const validData = data.filter(d => d.bt !== null)
      const latest = validData[validData.length - 1] || { bz_gsm: 0, bt: 0 }
      
      const result = {
        bz: latest.bz_gsm,
        bt: latest.bt,
      }

      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("[SWPC] Failed to fetch magnetic field data:", error)
      return { bz: 0, bt: 0 }
    }
  }

  /**
   * Fetch comprehensive space weather conditions
   */
  async fetchConditions(): Promise<SpaceWeatherConditions> {
    const [scales, plasma, mag] = await Promise.all([
      this.fetchCurrentScales(),
      this.fetchSolarWindPlasma(),
      this.fetchMagneticField(),
    ])

    return {
      solarWindSpeed: plasma.speed,
      solarWindDensity: plasma.density,
      solarWindTemperature: plasma.temperature,
      bz: mag.bz,
      bt: mag.bt,
      gScale: scales.g,
      sScale: scales.s,
      rScale: scales.r,
      radioFlux: 0, // Would need separate API call
      kpIndex: 0,   // Would need separate API call
      sunspotNumber: 0, // Would need separate API call
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Get space weather events
   */
  async fetchEvents(): Promise<Event[]> {
    const conditions = await this.fetchConditions()
    return spaceWeatherToEvent(conditions)
  }

  /**
   * Fetch and publish events to event bus
   */
  async fetchAndPublish(): Promise<{ published: number; events: Event[] }> {
    const events = await this.fetchEvents()
    const eventBus = getEventBus()

    let published = 0
    for (const event of events) {
      try {
        await eventBus.publishEvent(event)
        published++
      } catch (error) {
        console.error(`[SWPC] Failed to publish event ${event.id}:`, error)
      }
    }

    return { published, events }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: SpaceWeatherClient | null = null

export function getSpaceWeatherClient(): SpaceWeatherClient {
  if (!clientInstance) {
    clientInstance = new SpaceWeatherClient()
  }
  return clientInstance
}
