/**
 * NOAA Space Weather Prediction Center (SWPC) Connector - Feb 18, 2026
 * 
 * Fixed parsing for all NOAA SWPC API endpoints:
 * - noaa-scales.json returns an OBJECT (keys: "-1", "0", "1"..."7"), NOT an array
 * - plasma-7-day.json returns array-of-arrays where row[0] is the HEADER
 * - mag-7-day.json returns array-of-arrays where row[0] is the HEADER
 * - noaa-planetary-k-index.json returns array-of-arrays where row[0] is the HEADER
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

// NOAA scales API returns an OBJECT with numeric keys (not an array)
// Key "-1" = current conditions, Keys "1"-"7" = 7-day forecast
interface SWPCScalesObject {
  [key: string]: {
    DateStamp: string
    TimeStamp: string
    R?: { Scale: number | null; Text: string | null }
    S?: { Scale: number | null; Text: string | null }
    G?: { Scale: number | null; Text: string | null }
  }
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
      properties: { scale: conditions.rScale, type: "R" },
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
      properties: { scale: conditions.sScale, type: "S" },
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
      properties: { scale: conditions.gScale, type: "G", kpIndex: conditions.kpIndex },
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
   * 
   * IMPORTANT: noaa-scales.json returns an OBJECT, not an array!
   * Key "-1" = current observed conditions
   * Keys "1"-"7" = 7-day forecast
   */
  async fetchCurrentScales(): Promise<{ r: number; s: number; g: number }> {
    const cacheKey = "scales"
    const cached = this.getCached<{ r: number; s: number; g: number }>(cacheKey)
    if (cached) return cached

    try {
      const response = await fetch(
        `${SWPC_API_BASE}/products/noaa-scales.json`,
        { cache: "no-store" }
      )

      if (!response.ok) {
        throw new Error(`SWPC scales API error: ${response.status}`)
      }

      // Response is an OBJECT with keys like "-1", "0", "1" ... "7"
      // Key "-1" = current NOW conditions
      const data: SWPCScalesObject = await response.json()
      
      // Use key "-1" for current conditions, fallback to "0"
      const current = data["-1"] || data["0"] || Object.values(data)[0]
      
      if (!current) {
        console.warn("[SWPC] No scale data found in response")
        return { r: 0, s: 0, g: 0 }
      }

      const result = {
        r: Number(current.R?.Scale ?? 0),
        s: Number(current.S?.Scale ?? 0),
        g: Number(current.G?.Scale ?? 0),
      }
      
      console.log(`[SWPC] Scales: R${result.r} S${result.s} G${result.g} (date: ${current.DateStamp} ${current.TimeStamp})`)
      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("[SWPC] Failed to fetch scales:", error)
      return { r: 0, s: 0, g: 0 }
    }
  }

  /**
   * Fetch real-time solar wind plasma data
   * 
   * IMPORTANT: plasma-7-day.json returns array-of-arrays where row[0] is the HEADER:
   * [["time_tag", "density", "speed", "temperature"], ["2026-02-18 00:00:00.000", "5.1", "450.0", "78000.0"], ...]
   */
  async fetchSolarWindPlasma(): Promise<{ speed: number; density: number; temperature: number }> {
    const cacheKey = "plasma"
    const cached = this.getCached<{ speed: number; density: number; temperature: number }>(cacheKey)
    if (cached) return cached

    try {
      const response = await fetch(
        `${SWPC_API_BASE}/products/solar-wind/plasma-7-day.json`,
        { cache: "no-store" }
      )

      if (!response.ok) {
        throw new Error(`SWPC plasma API error: ${response.status}`)
      }

      // Response is array-of-arrays; row[0] is headers: ["time_tag", "density", "speed", "temperature"]
      const rows: (string | number)[][] = await response.json()
      
      if (!Array.isArray(rows) || rows.length < 2) {
        return { speed: 0, density: 0, temperature: 0 }
      }

      // Find column indices from header row
      const header = rows[0] as string[]
      const timeIdx = header.indexOf("time_tag")
      const densityIdx = header.indexOf("density")
      const speedIdx = header.indexOf("speed")
      const tempIdx = header.indexOf("temperature")
      
      // Find last row with valid (non-null) data - skip header row (index 0)
      let latest: (string | number)[] | null = null
      for (let i = rows.length - 1; i >= 1; i--) {
        const row = rows[i]
        if (row[speedIdx] !== null && row[speedIdx] !== undefined && row[speedIdx] !== "") {
          latest = row
          break
        }
      }

      if (!latest) {
        return { speed: 0, density: 0, temperature: 0 }
      }
      
      const result = {
        speed: parseFloat(String(latest[speedIdx] ?? 0)) || 0,
        density: parseFloat(String(latest[densityIdx] ?? 0)) || 0,
        temperature: parseFloat(String(latest[tempIdx] ?? 0)) || 0,
      }
      
      console.log(`[SWPC] Solar wind: ${result.speed.toFixed(0)} km/s, density: ${result.density.toFixed(1)} p/cm³`)
      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("[SWPC] Failed to fetch plasma data:", error)
      return { speed: 0, density: 0, temperature: 0 }
    }
  }

  /**
   * Fetch real-time interplanetary magnetic field data
   * 
   * IMPORTANT: mag-7-day.json returns array-of-arrays where row[0] is the HEADER:
   * [["time_tag", "bx_gsm", "by_gsm", "bz_gsm", "lon_gsm", "lat_gsm", "bt"], ...]
   */
  async fetchMagneticField(): Promise<{ bz: number; bt: number }> {
    const cacheKey = "mag"
    const cached = this.getCached<{ bz: number; bt: number }>(cacheKey)
    if (cached) return cached

    try {
      const response = await fetch(
        `${SWPC_API_BASE}/products/solar-wind/mag-7-day.json`,
        { cache: "no-store" }
      )

      if (!response.ok) {
        throw new Error(`SWPC mag API error: ${response.status}`)
      }

      // Response is array-of-arrays; row[0] is headers: ["time_tag", "bx_gsm", "by_gsm", "bz_gsm", "lon_gsm", "lat_gsm", "bt"]
      const rows: (string | number)[][] = await response.json()
      
      if (!Array.isArray(rows) || rows.length < 2) {
        return { bz: 0, bt: 0 }
      }

      // Find column indices from header row
      const header = rows[0] as string[]
      const bzIdx = header.indexOf("bz_gsm")
      const btIdx = header.indexOf("bt")
      
      // Find last row with valid (non-null) data - skip header row (index 0)
      let latest: (string | number)[] | null = null
      for (let i = rows.length - 1; i >= 1; i--) {
        const row = rows[i]
        if (row[btIdx] !== null && row[btIdx] !== undefined && row[btIdx] !== "") {
          latest = row
          break
        }
      }

      if (!latest) {
        return { bz: 0, bt: 0 }
      }

      const result = {
        bz: parseFloat(String(latest[bzIdx] ?? 0)) || 0,
        bt: parseFloat(String(latest[btIdx] ?? 0)) || 0,
      }
      
      console.log(`[SWPC] Magnetic field: Bz=${result.bz.toFixed(1)} nT, Bt=${result.bt.toFixed(1)} nT`)
      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("[SWPC] Failed to fetch magnetic field data:", error)
      return { bz: 0, bt: 0 }
    }
  }

  /**
   * Fetch planetary K-index (0-9 geomagnetic activity index)
   * 
   * noaa-planetary-k-index.json returns array-of-arrays where row[0] is header:
   * [["time_tag", "kp"], ["2026-02-18 00:00:00.000", "1.33"], ...]
   */
  async fetchKpIndex(): Promise<number> {
    const cacheKey = "kp"
    const cached = this.getCached<number>(cacheKey)
    if (cached !== null) return cached

    try {
      const response = await fetch(
        `${SWPC_API_BASE}/products/noaa-planetary-k-index.json`,
        { cache: "no-store" }
      )

      if (!response.ok) {
        throw new Error(`SWPC KP API error: ${response.status}`)
      }

      // Returns array-of-arrays; row[0] is headers: ["time_tag", "kp"]
      const rows: (string | number)[][] = await response.json()
      
      if (!Array.isArray(rows) || rows.length < 2) {
        return 0
      }

      // Find last row with valid kp value (skip header row index 0)
      let kp = 0
      for (let i = rows.length - 1; i >= 1; i--) {
        const val = parseFloat(String(rows[i][1] ?? ""))
        if (!isNaN(val)) {
          kp = Math.round(val * 10) / 10
          break
        }
      }
      
      console.log(`[SWPC] KP index: ${kp}`)
      this.setCache(cacheKey, kp)
      return kp
    } catch (error) {
      console.error("[SWPC] Failed to fetch KP index:", error)
      return 0
    }
  }

  /**
   * Fetch 10.7cm solar radio flux (F10.7 index)
   * 
   * 10cm-flux-30-day.json returns array-of-arrays where row[0] is header:
   * [["time_tag", "flux", "observed_flux", "absolute_flux"], ...]
   */
  async fetchRadioFlux(): Promise<number> {
    const cacheKey = "flux"
    const cached = this.getCached<number>(cacheKey)
    if (cached !== null) return cached

    try {
      const response = await fetch(
        `${SWPC_API_BASE}/products/10cm-flux-30-day.json`,
        { cache: "no-store" }
      )

      if (!response.ok) {
        throw new Error(`SWPC flux API error: ${response.status}`)
      }

      // Returns array-of-arrays; row[0] is headers: ["time_tag", "flux", "observed_flux", "absolute_flux"]
      const rows: (string | number)[][] = await response.json()
      
      if (!Array.isArray(rows) || rows.length < 2) {
        return 0
      }

      // Use the most recent row's observed_flux (column 2) - skip header row
      const latestRow = rows[rows.length - 1]
      const flux = parseFloat(String(latestRow?.[2] ?? latestRow?.[1] ?? 0)) || 0
      
      console.log(`[SWPC] Radio flux (F10.7): ${flux} SFU`)
      this.setCache(cacheKey, flux)
      return flux
    } catch (error) {
      console.error("[SWPC] Failed to fetch radio flux:", error)
      return 0
    }
  }

  /**
   * Fetch comprehensive space weather conditions - combines all SWPC data sources
   */
  async fetchConditions(): Promise<SpaceWeatherConditions> {
    const [scales, plasma, mag, kp, flux] = await Promise.all([
      this.fetchCurrentScales(),
      this.fetchSolarWindPlasma(),
      this.fetchMagneticField(),
      this.fetchKpIndex(),
      this.fetchRadioFlux(),
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
      radioFlux: flux,
      kpIndex: kp,
      sunspotNumber: 0, // Would need solar cycle indices API
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Get space weather events based on current conditions
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
