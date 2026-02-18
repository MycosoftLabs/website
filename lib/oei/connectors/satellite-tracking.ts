/**
 * Satellite Tracking Connector - Feb 18, 2026
 * 
 * Fetches real-time satellite position data using Two-Line Element (TLE) data.
 * 
 * Primary source: tle.ivanstanojevic.me (CelesTrak mirror, accessible)
 * Secondary source: CelesTrak direct (celestrak.org - may be network-blocked in some envs)
 * 
 * Data sources:
 * - TLE API: https://tle.ivanstanojevic.me/api/tle/ (primary - works everywhere)
 * - CelesTrak: https://celestrak.org/NORAD/elements/gp.php (secondary/production)
 */

import type { Entity, GeoLocation, Provenance } from "@/types/oei"
import { getEventBus } from "../event-bus"

const TLE_API_BASE = "https://tle.ivanstanojevic.me/api/tle"
const CELESTRAK_API = "https://celestrak.org/NORAD/elements/gp.php"

// =============================================================================
// TYPES
// =============================================================================

export interface SatelliteEntity extends Entity {
  type: "satellite"
  noradId?: number
  intlDesignator?: string
  objectType?: string
  orbitType?: string
  isActive?: boolean
  country?: string
  launchDate?: string
  lastSeen?: string
  estimatedPosition?: {
    longitude: number
    latitude: number
    altitude?: number
  }
  orbitalParams?: {
    inclination?: number
    apogee?: number
    perigee?: number
    period?: number
    velocity?: number
  }
  // Legacy properties object for backwards compatibility
  properties: {
    noradId: number
    intlDesignator: string
    objectType: string
    launchDate?: string
    orbitType: string
    inclination: number
    apogee: number
    perigee: number
    period: number
    velocity?: number
    isActive: boolean
    owner?: string
  }
}

export interface SatelliteQuery {
  category?: SatelliteCategory
  noradIds?: number[]
  limit?: number
}

export type SatelliteCategory = 
  | "stations"        // ISS, Tiangong, space stations
  | "starlink"        // SpaceX Starlink constellation
  | "oneweb"          // OneWeb constellation
  | "planet"          // Planet Labs imaging satellites
  | "weather"         // Weather satellites (GOES, NOAA, Meteosat)
  | "gnss"            // Navigation: GPS, GLONASS, Galileo, BeiDou
  | "active"          // Broad active satellite set
  | "debris"          // Space debris (collision fragments)

// TLE API response format from tle.ivanstanojevic.me
interface TLEApiItem {
  "@id": string
  "@type": "Tle"
  satelliteId: number
  name: string
  date: string
  line1: string
  line2: string
}

// Parsed TLE orbital elements (from TLE lines)
interface ParsedTLE {
  noradId: number
  intlDesignator: string
  name: string
  epoch: string
  meanMotion: number       // revolutions/day
  eccentricity: number
  inclination: number      // degrees
  raAscNode: number        // right ascension of ascending node, degrees
  argPericenter: number    // degrees
  meanAnomaly: number      // degrees
  bstar: number
  meanMotionDot: number
}

// CelesTrak GP format (for when CelesTrak is accessible)
interface CelesTrakGP {
  OBJECT_NAME: string
  OBJECT_ID: string
  NORAD_CAT_ID: number
  EPOCH: string
  MEAN_MOTION: number
  ECCENTRICITY: number
  INCLINATION: number
  RA_OF_ASC_NODE: number
  ARG_OF_PERICENTER: number
  MEAN_ANOMALY: number
  CLASSIFICATION_TYPE: string
  ELEMENT_SET_NO: number
  REV_AT_EPOCH: number
  BSTAR: number
  MEAN_MOTION_DOT: number
  MEAN_MOTION_DDOT: number
}

// Category → search terms mapping for TLE API
// Keep search terms minimal (1-3 per category) to avoid timeouts
const CATEGORY_SEARCHES: Record<SatelliteCategory, string[]> = {
  stations:  ["zarya"],          // ISS fetched by NORAD ID, zarya catches related
  starlink:  ["starlink"],       // Single search, highly paginated
  oneweb:    ["oneweb"],
  planet:    ["flock"],          // Planet Labs uses "flock" naming
  weather:   ["goes", "noaa"],   // Two key terms only
  gnss:      ["gps", "glonass"], // Two key terms
  active:    ["hubble"],         // Sample of notable active sats (stations fetched separately)
  debris:    ["deb"],            // Debris suffix
}

// Per-category fetch limits to control response size and response time
const CATEGORY_LIMITS: Record<SatelliteCategory, number> = {
  stations:  50,
  starlink:  200,
  oneweb:    200,
  planet:    100,
  weather:   80,
  gnss:      100,
  active:    100,
  debris:    300,
}

// =============================================================================
// TLE LINE PARSING
// =============================================================================

/**
 * Parse TLE line1 and line2 into structured orbital elements
 * TLE format: https://celestrak.org/NORAD/elements/table.php
 */
function parseTLELines(noradId: number, name: string, line1: string, line2: string): ParsedTLE | null {
  try {
    // Line 1 parsing
    // Column indices (0-based): 
    // 9-16: Int'l designator, 18-31: Epoch, 33-42: mean motion dot, 53-60: BSTAR
    const intlDesignator = line1.substring(9, 17).trim()
    const epochStr = line1.substring(18, 32).trim()
    const meanMotionDot = parseFloat(line1.substring(33, 43))
    const bstarStr = line1.substring(53, 61).trim()
    
    // Parse epoch: YYDDD.DDDDDDDD
    // YY = year (57-99 → 1957-1999, 00-56 → 2000-2056)
    const yy = parseInt(epochStr.substring(0, 2))
    const year = yy >= 57 ? 1900 + yy : 2000 + yy
    const dayOfYear = parseFloat(epochStr.substring(2))
    const epochDate = new Date(year, 0, 1)
    epochDate.setDate(epochDate.getDate() + Math.floor(dayOfYear) - 1)
    epochDate.setMilliseconds((dayOfYear % 1) * 86400000)
    
    // Parse BSTAR (scientific notation format: SMMMMM+EE)
    let bstar = 0
    if (bstarStr !== "00000+0" && bstarStr !== "00000-0") {
      const sign = bstarStr[0] === "-" ? -1 : 1
      const mantissaStr = bstarStr.substring(1, 6)
      const expSign = bstarStr[6] === "-" ? -1 : 1
      const exp = parseInt(bstarStr.substring(7))
      bstar = sign * parseFloat("0." + mantissaStr) * Math.pow(10, expSign * exp)
    }
    
    // Line 2 parsing
    const inclination = parseFloat(line2.substring(8, 16))
    const raAscNode = parseFloat(line2.substring(17, 25))
    // Eccentricity: 7 digits with implied decimal point
    const eccentricity = parseFloat("0." + line2.substring(26, 33))
    const argPericenter = parseFloat(line2.substring(34, 42))
    const meanAnomaly = parseFloat(line2.substring(43, 51))
    const meanMotion = parseFloat(line2.substring(52, 63))
    
    if (isNaN(meanMotion) || isNaN(inclination) || isNaN(eccentricity)) {
      return null
    }
    
    return {
      noradId,
      intlDesignator,
      name,
      epoch: epochDate.toISOString(),
      meanMotion,
      eccentricity,
      inclination,
      raAscNode,
      argPericenter,
      meanAnomaly,
      bstar,
      meanMotionDot: isNaN(meanMotionDot) ? 0 : meanMotionDot,
    }
  } catch (err) {
    return null
  }
}

// =============================================================================
// ORBITAL MECHANICS
// =============================================================================

const EARTH_RADIUS_KM = 6371
const MU = 398600.4418 // GM of Earth in km³/s²

function calculateOrbitalParameters(meanMotion: number, eccentricity: number) {
  const meanMotionRadPerSec = (meanMotion * 2 * Math.PI) / 86400
  const semiMajorAxis = Math.pow(MU / Math.pow(meanMotionRadPerSec, 2), 1 / 3)
  const apogee = semiMajorAxis * (1 + eccentricity) - EARTH_RADIUS_KM
  const perigee = semiMajorAxis * (1 - eccentricity) - EARTH_RADIUS_KM
  const period = (2 * Math.PI / meanMotionRadPerSec) / 60
  const velocity = Math.sqrt(MU * (2 / (EARTH_RADIUS_KM + Math.max(1, perigee)) - 1 / semiMajorAxis))
  return { apogee, perigee, period, velocity, semiMajorAxis }
}

function getOrbitType(inclination: number, period: number, eccentricity: number): string {
  if (period < 120 && inclination > 80) return "Polar LEO"
  if (period < 130) return "LEO"
  if (period > 1420 && period < 1450) return "GEO"
  if (period > 700 && period < 800) return "MEO"
  if (eccentricity > 0.5) return "HEO"
  return "Elliptical"
}

function getObjectType(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("starlink")) return "Communication"
  if (n.includes("oneweb")) return "Communication"
  if (n.includes("iss") || n.includes("zarya")) return "Space Station"
  if (n.includes("tiangong") || n.includes("tianhe") || n.includes("css")) return "Space Station"
  if (n.includes("gps") || n.includes("navstar") || n.includes("biir")) return "Navigation"
  if (n.includes("glonass")) return "Navigation"
  if (n.includes("galileo")) return "Navigation"
  if (n.includes("beidou")) return "Navigation"
  if (n.includes("goes") || n.includes("meteosat") || n.includes("himawari")) return "Weather"
  if (n.includes("noaa") && !n.includes("goes")) return "Weather"
  if (n.includes("metop")) return "Weather"
  if (n.includes("terra") || n.includes("aqua")) return "Earth Observation"
  if (n.includes("landsat")) return "Earth Observation"
  if (n.includes("sentinel")) return "Earth Observation"
  if (n.includes("planet") || n.includes("flock") || n.includes("dove")) return "Imaging"
  if (n.includes("hubble") || n.includes("telescope")) return "Astronomy"
  if (n.includes("deb") || n.includes("debris")) return "Debris"
  if (n.includes("r/b") || n.includes("rocket")) return "Rocket Body"
  return "Satellite"
}

/**
 * Estimate current position from parsed TLE data
 * Uses simplified orbital mechanics (not full SGP4, but directionally accurate)
 */
function estimatePosition(tle: ParsedTLE): GeoLocation | null {
  try {
    const epochDate = new Date(tle.epoch)
    const now = new Date()
    const elapsedMinutes = (now.getTime() - epochDate.getTime()) / 60000
    
    // Progress in orbit since epoch
    const meanMotionRadPerMin = (tle.meanMotion * 2 * Math.PI) / 1440
    const currentMeanAnomaly = (tle.meanAnomaly + (meanMotionRadPerMin * elapsedMinutes) * (180 / Math.PI)) % 360
    
    const orbital = calculateOrbitalParameters(tle.meanMotion, tle.eccentricity)
    
    // Earth rotates 360° in 24 hours = 0.25°/minute
    const earthRotation = elapsedMinutes * 0.25
    
    // Simplified longitude estimate
    const longitude = (tle.raAscNode + currentMeanAnomaly - earthRotation) % 360
    const adjustedLon = longitude > 180 ? longitude - 360 : longitude < -180 ? longitude + 360 : longitude
    
    // Latitude oscillates with inclination
    const latitude = tle.inclination * Math.sin((currentMeanAnomaly * Math.PI) / 180)
    const altitude = (orbital.apogee + orbital.perigee) / 2

    return {
      latitude: Math.max(-90, Math.min(90, latitude)),
      longitude: Math.max(-180, Math.min(180, adjustedLon)),
      altitude: altitude * 1000, // Convert km to meters
      source: "calculated",
    }
  } catch {
    return null
  }
}

// =============================================================================
// CONVERTERS
// =============================================================================

function parsedTLEToEntity(tle: ParsedTLE): SatelliteEntity {
  const orbital = calculateOrbitalParameters(tle.meanMotion, tle.eccentricity)
  const position = estimatePosition(tle)
  
  const provenance: Provenance = {
    source: "celestrak",
    sourceId: String(tle.noradId),
    collectedAt: new Date().toISOString(),
    url: `https://tle.ivanstanojevic.me/api/tle/${tle.noradId}`,
    reliability: 0.95,
    metadata: {
      epoch: tle.epoch,
      tleSource: "tle.ivanstanojevic.me",
    },
  }

  const orbitType = getOrbitType(tle.inclination, orbital.period, tle.eccentricity)
  const objectType = getObjectType(tle.name)
  const isActive = !tle.name.toUpperCase().includes("DEB") && !tle.name.includes("R/B")

  return {
    id: `sat_${tle.noradId}`,
    type: "satellite",
    name: tle.name,
    description: `${objectType} - ${orbitType} orbit`,
    location: position || undefined,
    estimatedPosition: position ? {
      longitude: position.longitude,
      latitude: position.latitude,
      altitude: position.altitude,
    } : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    status: "active",
    provenance,
    tags: [objectType, orbitType],
    noradId: tle.noradId,
    intlDesignator: tle.intlDesignator,
    objectType,
    orbitType,
    isActive,
    orbitalParams: {
      inclination: Math.round(tle.inclination * 10) / 10,
      apogee: Math.round(orbital.apogee),
      perigee: Math.round(orbital.perigee),
      period: Math.round(orbital.period * 10) / 10,
      velocity: Math.round(orbital.velocity * 100) / 100,
    },
    properties: {
      noradId: tle.noradId,
      intlDesignator: tle.intlDesignator,
      objectType,
      orbitType,
      inclination: Math.round(tle.inclination * 10) / 10,
      apogee: Math.round(orbital.apogee),
      perigee: Math.round(orbital.perigee),
      period: Math.round(orbital.period * 10) / 10,
      velocity: Math.round(orbital.velocity * 100) / 100,
      isActive,
    },
  }
}

// Convert CelesTrak GP format directly
function celestrakGPToEntity(gp: CelesTrakGP): SatelliteEntity {
  const tle: ParsedTLE = {
    noradId: gp.NORAD_CAT_ID,
    intlDesignator: gp.OBJECT_ID,
    name: gp.OBJECT_NAME,
    epoch: gp.EPOCH,
    meanMotion: gp.MEAN_MOTION,
    eccentricity: gp.ECCENTRICITY,
    inclination: gp.INCLINATION,
    raAscNode: gp.RA_OF_ASC_NODE,
    argPericenter: gp.ARG_OF_PERICENTER,
    meanAnomaly: gp.MEAN_ANOMALY,
    bstar: gp.BSTAR,
    meanMotionDot: gp.MEAN_MOTION_DOT,
  }
  return parsedTLEToEntity(tle)
}

// =============================================================================
// API CLIENT
// =============================================================================

export class SatelliteTrackingClient {
  private n2yoApiKey?: string
  private cache: Map<string, { data: SatelliteEntity[]; timestamp: number }> = new Map()
  private cacheTTL = 300000 // 5 minute cache

  constructor(n2yoApiKey?: string) {
    this.n2yoApiKey = n2yoApiKey
  }

  /**
   * Fetch satellites from TLE API by search term with pagination
   * Returns up to `limit` results across multiple pages if needed
   */
  private async fetchFromTLEAPI(searchTerm: string, limit: number): Promise<SatelliteEntity[]> {
    const pageSize = Math.min(100, limit)
    const entities: SatelliteEntity[] = []
    let page = 1
    let totalFetched = 0
    
    try {
      // Fetch up to limit results, paging as needed
      while (totalFetched < limit) {
        const url = searchTerm 
          ? `${TLE_API_BASE}/?search=${encodeURIComponent(searchTerm)}&page=${page}&page-size=${pageSize}`
          : `${TLE_API_BASE}/?page=${page}&page-size=${pageSize}`
          
        const response = await fetch(url, {
          headers: { "Accept": "application/json" },
        })
        
        if (!response.ok) {
          throw new Error(`TLE API error: ${response.status}`)
        }
        
        const data = await response.json()
        const items: TLEApiItem[] = data.member || []
        
        if (items.length === 0) break
        
        for (const item of items) {
          if (item.line1 && item.line2) {
            const tle = parseTLELines(item.satelliteId, item.name, item.line1, item.line2)
            if (tle) {
              entities.push(parsedTLEToEntity(tle))
              totalFetched++
              if (totalFetched >= limit) break
            }
          }
        }
        
        // If we got fewer than pageSize, we've hit the end
        if (items.length < pageSize) break
        page++
      }
      
      return entities
    } catch (error) {
      console.error(`[Satellite] TLE API error for search "${searchTerm}":`, error)
      throw error
    }
  }

  /**
   * Try CelesTrak GP format (secondary source for production envs)
   */
  private async fetchFromCelesTrak(group: string, limit?: number): Promise<SatelliteEntity[]> {
    const url = `${CELESTRAK_API}?GROUP=${group}&FORMAT=JSON`
    
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`CelesTrak error: ${response.status}`)
    }

    const text = await response.text()
    if (text.startsWith("<")) {
      throw new Error(`CelesTrak returned HTML for group "${group}"`)
    }

    const tleData: CelesTrakGP[] = JSON.parse(text)
    if (!Array.isArray(tleData)) {
      throw new Error(`CelesTrak returned non-array for group "${group}"`)
    }

    const entities = tleData.map(celestrakGPToEntity)
    return limit ? entities.slice(0, limit) : entities
  }

  /**
   * Fetch satellites by category
   * Tries CelesTrak first, falls back to TLE API mirror
   */
  async fetchByCategory(category: SatelliteCategory, limit?: number): Promise<SatelliteEntity[]> {
    const cacheKey = `cat_${category}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      const result = cached.data
      return limit ? result.slice(0, limit) : result
    }

    const fetchLimit = limit ?? CATEGORY_LIMITS[category]
    
    // CelesTrak group mapping (for production where CelesTrak is accessible)
    const celestrakGroupMap: Partial<Record<SatelliteCategory, string>> = {
      stations: "stations",
      starlink: "starlink",
      oneweb: "oneweb",
      planet: "planet",
      weather: "weather",
      gnss: "gnss",
      active: "active",
    }

    // Try CelesTrak first (fast and comprehensive)
    const celestrakGroup = celestrakGroupMap[category]
    if (celestrakGroup) {
      try {
        const entities = await this.fetchFromCelesTrak(celestrakGroup, fetchLimit)
        if (entities.length > 0) {
          console.log(`[Satellite] CelesTrak ${category}: ${entities.length} satellites`)
          this.cache.set(cacheKey, { data: entities, timestamp: Date.now() })
          return entities
        }
      } catch (err) {
        console.warn(`[Satellite] CelesTrak unavailable for ${category}, using TLE API mirror: ${(err as Error).message}`)
      }
    }

    // Fallback: TLE API mirror (tle.ivanstanojevic.me)
    const searches = CATEGORY_SEARCHES[category]
    
    if (category === "debris") {
      // Debris: search specifically for "deb" suffix
      const entities = await this.fetchFromTLEAPI("deb", fetchLimit)
      this.cache.set(cacheKey, { data: entities, timestamp: Date.now() })
      return entities
    }
    
    if (category === "stations") {
      // Stations: fetch ISS by NORAD ID directly + search
      const issEntities = await this.fetchByNoradId([25544, 48274]) // ISS + CSS/Tiangong
      const searchEntities = await this.fetchFromTLEAPI("zarya", 20)
      const combined = Array.from(new Map([...issEntities, ...searchEntities].map(e => [e.id, e])).values())
      this.cache.set(cacheKey, { data: combined, timestamp: Date.now() })
      return combined
    }
    
    // Multi-term search for weather, gnss, etc.
    const allEntities: SatelliteEntity[] = []
    const perSearchLimit = Math.ceil(fetchLimit / searches.length)
    
    const results = await Promise.allSettled(
      searches.map(term => this.fetchFromTLEAPI(term, perSearchLimit))
    )
    
    for (const result of results) {
      if (result.status === "fulfilled") {
        allEntities.push(...result.value)
      }
    }
    
    // Deduplicate
    const unique = Array.from(new Map(allEntities.map(e => [e.id, e])).values())
    const final = unique.slice(0, fetchLimit)
    
    console.log(`[Satellite] TLE API ${category}: ${final.length} satellites`)
    this.cache.set(cacheKey, { data: final, timestamp: Date.now() })
    return final
  }

  /**
   * Fetch specific satellites by NORAD IDs
   */
  async fetchByNoradId(noradIds: number[]): Promise<SatelliteEntity[]> {
    const entities: SatelliteEntity[] = []
    
    await Promise.allSettled(
      noradIds.map(async (id) => {
        try {
          const response = await fetch(`${TLE_API_BASE}/${id}`, {
            headers: { "Accept": "application/json" },
          })
          if (!response.ok) return
          
          const item: TLEApiItem = await response.json()
          if (item.line1 && item.line2) {
            const tle = parseTLELines(item.satelliteId, item.name, item.line1, item.line2)
            if (tle) entities.push(parsedTLEToEntity(tle))
          }
        } catch (error) {
          console.error(`[Satellite] Failed to fetch NORAD ${id}:`, error)
        }
      })
    )
    
    return entities
  }

  /**
   * Fetch ISS position
   */
  async fetchISS(): Promise<SatelliteEntity | null> {
    const entities = await this.fetchByNoradId([25544])
    return entities[0] || null
  }

  /**
   * Fetch satellites based on query
   */
  async fetchSatellites(query?: SatelliteQuery): Promise<SatelliteEntity[]> {
    if (query?.noradIds && query.noradIds.length > 0) {
      return this.fetchByNoradId(query.noradIds)
    }
    return this.fetchByCategory(query?.category || "stations", query?.limit)
  }

  /**
   * Fetch and publish entities to event bus
   */
  async fetchAndPublish(query?: SatelliteQuery): Promise<{ published: number; entities: SatelliteEntity[] }> {
    const entities = await this.fetchSatellites(query)
    const eventBus = getEventBus()

    let published = 0
    for (const entity of entities) {
      try {
        await eventBus.publishEntity(entity)
        published++
      } catch (error) {
        console.error(`[Satellite] Failed to publish entity ${entity.id}:`, error)
      }
    }

    return { published, entities }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: SatelliteTrackingClient | null = null

export function getSatelliteTrackingClient(): SatelliteTrackingClient {
  if (!clientInstance) {
    const n2yoKey = process.env.N2YO_API_KEY
    clientInstance = new SatelliteTrackingClient(n2yoKey)
  }
  return clientInstance
}
