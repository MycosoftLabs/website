/**
 * Satellite Tracking Connector
 * 
 * Fetches real-time satellite position data using TLE (Two-Line Element) data
 * from various sources including CelesTrak and Space-Track.org
 * 
 * Data sources:
 * - CelesTrak: https://celestrak.org/
 * - Space-Track: https://www.space-track.org/
 * - N2YO: https://www.n2yo.com/
 */

import type { Entity, GeoLocation, Provenance } from "@/types/oei"
import { getEventBus } from "../event-bus"

const CELESTRAK_API = "https://celestrak.org/NORAD/elements/gp.php"
const N2YO_API = "https://api.n2yo.com/rest/v1/satellite"

// =============================================================================
// TYPES
// =============================================================================

export interface SatelliteEntity extends Entity {
  type: "satellite"
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
  | "stations"        // ISS, Tiangong, etc.
  | "starlink"        // SpaceX Starlink
  | "oneweb"          // OneWeb
  | "planet"          // Planet Labs imaging
  | "weather"         // Weather satellites
  | "gnss"            // GPS, GLONASS, Galileo, BeiDou
  | "active"          // All active satellites
  | "debris"          // Space debris tracking

interface TLEData {
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
  TLE_LINE0?: string
  TLE_LINE1?: string
  TLE_LINE2?: string
}

interface N2YOPosition {
  satname: string
  satid: number
  satlatitude: number
  satlongitude: number
  sataltitude: number
  azimuth: number
  elevation: number
  ra: number
  dec: number
  timestamp: number
}

// =============================================================================
// ORBITAL MECHANICS
// =============================================================================

// Constants
const EARTH_RADIUS_KM = 6371
const MU = 398600.4418 // GM of Earth in km³/s²

function calculateOrbitalParameters(meanMotion: number, eccentricity: number) {
  // Mean motion is in revolutions per day
  const meanMotionRadPerSec = (meanMotion * 2 * Math.PI) / 86400
  
  // Semi-major axis from mean motion
  const semiMajorAxis = Math.pow(MU / Math.pow(meanMotionRadPerSec, 2), 1/3)
  
  // Apogee and perigee
  const apogee = semiMajorAxis * (1 + eccentricity) - EARTH_RADIUS_KM
  const perigee = semiMajorAxis * (1 - eccentricity) - EARTH_RADIUS_KM
  
  // Orbital period in minutes
  const period = (2 * Math.PI / meanMotionRadPerSec) / 60
  
  // Orbital velocity at perigee (km/s)
  const velocity = Math.sqrt(MU * (2 / (EARTH_RADIUS_KM + perigee) - 1 / semiMajorAxis))
  
  return { apogee, perigee, period, velocity, semiMajorAxis }
}

function getOrbitType(inclination: number, period: number, eccentricity: number): string {
  if (period < 120 && inclination > 80) return "Polar LEO"
  if (period < 100) return "LEO"
  if (period > 1420 && period < 1450) return "GEO"
  if (period > 700 && period < 800) return "MEO"
  if (eccentricity > 0.5) return "HEO"
  return "Elliptical"
}

function getObjectType(name: string): string {
  const nameLower = name.toLowerCase()
  if (nameLower.includes("starlink")) return "Communication"
  if (nameLower.includes("oneweb")) return "Communication"
  if (nameLower.includes("iss") || nameLower.includes("zarya")) return "Space Station"
  if (nameLower.includes("tiangong") || nameLower.includes("tianhe")) return "Space Station"
  if (nameLower.includes("gps") || nameLower.includes("navstar")) return "Navigation"
  if (nameLower.includes("glonass")) return "Navigation"
  if (nameLower.includes("galileo")) return "Navigation"
  if (nameLower.includes("beidou")) return "Navigation"
  if (nameLower.includes("goes") || nameLower.includes("noaa")) return "Weather"
  if (nameLower.includes("terra") || nameLower.includes("aqua")) return "Earth Observation"
  if (nameLower.includes("landsat")) return "Earth Observation"
  if (nameLower.includes("sentinel")) return "Earth Observation"
  if (nameLower.includes("planet") || nameLower.includes("dove")) return "Imaging"
  if (nameLower.includes("hubble") || nameLower.includes("telescope")) return "Astronomy"
  if (nameLower.includes("deb") || nameLower.includes("debris")) return "Debris"
  if (nameLower.includes("r/b") || nameLower.includes("rocket")) return "Rocket Body"
  return "Satellite"
}

// =============================================================================
// POSITION CALCULATION (Simplified SGP4)
// =============================================================================

function estimateCurrentPosition(tle: TLEData): GeoLocation | null {
  // This is a simplified position estimation
  // For accurate positions, use a proper SGP4 library
  
  const epochDate = new Date(tle.EPOCH)
  const now = new Date()
  const elapsedMinutes = (now.getTime() - epochDate.getTime()) / 60000
  
  // Calculate current mean anomaly
  const meanMotionRadPerMin = (tle.MEAN_MOTION * 2 * Math.PI) / 1440
  const currentMeanAnomaly = (tle.MEAN_ANOMALY + (meanMotionRadPerMin * elapsedMinutes) * (180 / Math.PI)) % 360
  
  // Simplified position (longitude estimation)
  const orbitalParameters = calculateOrbitalParameters(tle.MEAN_MOTION, tle.ECCENTRICITY)
  
  // Earth rotates 360° in 24 hours = 0.25°/minute
  const earthRotation = elapsedMinutes * 0.25
  
  // Very rough longitude estimate
  const longitude = (tle.RA_OF_ASC_NODE + currentMeanAnomaly - earthRotation) % 360
  const adjustedLon = longitude > 180 ? longitude - 360 : longitude
  
  // Latitude oscillates based on inclination and position in orbit
  const latitude = tle.INCLINATION * Math.sin((currentMeanAnomaly * Math.PI) / 180)
  
  // Altitude varies with orbital position
  const altitude = (orbitalParameters.apogee + orbitalParameters.perigee) / 2

  return {
    latitude: Math.max(-90, Math.min(90, latitude)),
    longitude: Math.max(-180, Math.min(180, adjustedLon)),
    altitude: altitude * 1000, // Convert to meters
    source: "calculated",
  }
}

// =============================================================================
// CONVERTERS
// =============================================================================

function tleToEntity(tle: TLEData): SatelliteEntity {
  const orbital = calculateOrbitalParameters(tle.MEAN_MOTION, tle.ECCENTRICITY)
  const position = estimateCurrentPosition(tle)
  
  const provenance: Provenance = {
    source: "celestrak",
    sourceId: String(tle.NORAD_CAT_ID),
    collectedAt: new Date().toISOString(),
    url: `https://celestrak.org/NORAD/elements/gp.php?CATNR=${tle.NORAD_CAT_ID}&FORMAT=JSON`,
    reliability: 0.95,
    metadata: {
      epoch: tle.EPOCH,
      classification: tle.CLASSIFICATION_TYPE,
    },
  }

  return {
    id: `sat_${tle.NORAD_CAT_ID}`,
    type: "satellite",
    name: tle.OBJECT_NAME,
    description: `${getObjectType(tle.OBJECT_NAME)} - ${getOrbitType(tle.INCLINATION, orbital.period, tle.ECCENTRICITY)} orbit`,
    location: position || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    status: "active",
    provenance,
    tags: [
      getObjectType(tle.OBJECT_NAME),
      getOrbitType(tle.INCLINATION, orbital.period, tle.ECCENTRICITY),
    ],
    properties: {
      noradId: tle.NORAD_CAT_ID,
      intlDesignator: tle.OBJECT_ID,
      objectType: getObjectType(tle.OBJECT_NAME),
      orbitType: getOrbitType(tle.INCLINATION, orbital.period, tle.ECCENTRICITY),
      inclination: tle.INCLINATION,
      apogee: Math.round(orbital.apogee),
      perigee: Math.round(orbital.perigee),
      period: Math.round(orbital.period * 10) / 10,
      velocity: Math.round(orbital.velocity * 100) / 100,
      isActive: !tle.OBJECT_NAME.includes("DEB") && !tle.OBJECT_NAME.includes("R/B"),
    },
  }
}

// =============================================================================
// API CLIENT
// =============================================================================

export class SatelliteTrackingClient {
  private n2yoApiKey?: string
  private cache: Map<string, { data: SatelliteEntity[]; timestamp: number }> = new Map()
  private cacheTTL = 300000 // 5 minute cache for TLE data

  constructor(n2yoApiKey?: string) {
    this.n2yoApiKey = n2yoApiKey
  }

  /**
   * Fetch satellites by category from CelesTrak
   */
  async fetchByCategory(category: SatelliteCategory, limit?: number): Promise<SatelliteEntity[]> {
    const cacheKey = `cat_${category}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return limit ? cached.data.slice(0, limit) : cached.data
    }

    // Map category to CelesTrak groups
    const categoryMap: Record<SatelliteCategory, string> = {
      stations: "stations",
      starlink: "starlink",
      oneweb: "oneweb",
      planet: "planet",
      weather: "weather",
      gnss: "gnss",
      active: "active",
      debris: "debris",
    }

    const group = categoryMap[category]
    
    try {
      const response = await fetch(
        `${CELESTRAK_API}?GROUP=${group}&FORMAT=JSON`,
        { next: { revalidate: 300 } }
      )

      if (!response.ok) {
        throw new Error(`CelesTrak API error: ${response.status}`)
      }

      const tleData: TLEData[] = await response.json()
      const entities = tleData.map(tleToEntity)
      
      this.cache.set(cacheKey, { data: entities, timestamp: Date.now() })
      
      return limit ? entities.slice(0, limit) : entities
    } catch (error) {
      console.error("[Satellite] Failed to fetch from CelesTrak:", error)
      return this.getSampleSatellites()
    }
  }

  /**
   * Fetch specific satellites by NORAD IDs
   */
  async fetchByNoradId(noradIds: number[]): Promise<SatelliteEntity[]> {
    const entities: SatelliteEntity[] = []
    
    for (const id of noradIds) {
      try {
        const response = await fetch(
          `${CELESTRAK_API}?CATNR=${id}&FORMAT=JSON`,
          { next: { revalidate: 300 } }
        )

        if (response.ok) {
          const tleData: TLEData[] = await response.json()
          if (tleData.length > 0) {
            entities.push(tleToEntity(tleData[0]))
          }
        }
      } catch (error) {
        console.error(`[Satellite] Failed to fetch NORAD ${id}:`, error)
      }
    }
    
    return entities
  }

  /**
   * Fetch ISS position (well-known satellite)
   */
  async fetchISS(): Promise<SatelliteEntity | null> {
    const entities = await this.fetchByNoradId([25544])
    return entities[0] || null
  }

  /**
   * Get sample satellite data for demo
   */
  private getSampleSatellites(): SatelliteEntity[] {
    const samples: TLEData[] = [
      {
        OBJECT_NAME: "ISS (ZARYA)",
        OBJECT_ID: "1998-067A",
        NORAD_CAT_ID: 25544,
        EPOCH: new Date().toISOString(),
        MEAN_MOTION: 15.5,
        ECCENTRICITY: 0.0001,
        INCLINATION: 51.6,
        RA_OF_ASC_NODE: 200,
        ARG_OF_PERICENTER: 0,
        MEAN_ANOMALY: 180,
        CLASSIFICATION_TYPE: "U",
        ELEMENT_SET_NO: 999,
        REV_AT_EPOCH: 10000,
        BSTAR: 0,
        MEAN_MOTION_DOT: 0,
        MEAN_MOTION_DDOT: 0,
      },
      {
        OBJECT_NAME: "STARLINK-1234",
        OBJECT_ID: "2020-001A",
        NORAD_CAT_ID: 45000,
        EPOCH: new Date().toISOString(),
        MEAN_MOTION: 15.06,
        ECCENTRICITY: 0.0001,
        INCLINATION: 53,
        RA_OF_ASC_NODE: 100,
        ARG_OF_PERICENTER: 0,
        MEAN_ANOMALY: 90,
        CLASSIFICATION_TYPE: "U",
        ELEMENT_SET_NO: 999,
        REV_AT_EPOCH: 5000,
        BSTAR: 0,
        MEAN_MOTION_DOT: 0,
        MEAN_MOTION_DDOT: 0,
      },
      {
        OBJECT_NAME: "HUBBLE SPACE TELESCOPE",
        OBJECT_ID: "1990-037B",
        NORAD_CAT_ID: 20580,
        EPOCH: new Date().toISOString(),
        MEAN_MOTION: 15.09,
        ECCENTRICITY: 0.0003,
        INCLINATION: 28.5,
        RA_OF_ASC_NODE: 150,
        ARG_OF_PERICENTER: 0,
        MEAN_ANOMALY: 270,
        CLASSIFICATION_TYPE: "U",
        ELEMENT_SET_NO: 999,
        REV_AT_EPOCH: 18000,
        BSTAR: 0,
        MEAN_MOTION_DOT: 0,
        MEAN_MOTION_DDOT: 0,
      },
    ]
    
    return samples.map(tleToEntity)
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
