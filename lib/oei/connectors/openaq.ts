/**
 * OpenAQ Air Quality Connector
 * 
 * Fetches real-time air quality data from OpenAQ.
 * API Docs: https://docs.openaq.org/
 * 
 * OpenAQ provides free access to air quality data from government and research monitors worldwide.
 */

import type { Observation, GeoLocation, GeoBounds, Provenance } from "@/types/oei"
import { getEventBus } from "../event-bus"

const OPENAQ_API_BASE = "https://api.openaq.org/v2"

// =============================================================================
// TYPES
// =============================================================================

interface OpenAQMeasurement {
  locationId: number
  location: string
  parameter: string
  value: number
  unit: string
  date: {
    utc: string
    local: string
  }
  coordinates?: {
    latitude: number
    longitude: number
  }
  country: string
  city?: string
  isMobile: boolean
  isAnalysis: boolean
  entity: string
  sensorType: string
}

interface OpenAQLocation {
  id: number
  name: string
  city?: string
  country: string
  coordinates: {
    latitude: number
    longitude: number
  }
  parameters: Array<{
    id: number
    unit: string
    count: number
    average: number
    lastValue: number
    parameter: string
    displayName: string
    lastUpdated: string
  }>
  sensorType: string
  entity: string
  isMobile: boolean
  isAnalysis: boolean
  firstUpdated: string
  lastUpdated: string
  measurements: number
}

interface OpenAQResponse<T> {
  meta: {
    name: string
    license: string
    website: string
    page: number
    limit: number
    found: number
  }
  results: T[]
}

export interface OpenAQQuery {
  // Location filters
  country?: string[]
  city?: string[]
  location_id?: number[]
  coordinates?: { lat: number; lng: number }
  radius?: number  // meters
  bounds?: GeoBounds
  
  // Parameter filters
  parameter?: string[]  // pm25, pm10, o3, no2, so2, co
  
  // Time filters
  date_from?: string
  date_to?: string
  
  // Other
  limit?: number
  page?: number
  sort?: "asc" | "desc"
  order_by?: "datetime" | "value" | "location"
  
  // Quality
  isMobile?: boolean
  isAnalysis?: boolean
}

export interface AirQualityObservation extends Observation {
  type: "air_quality"
  values: {
    pm25?: number
    pm10?: number
    o3?: number
    no2?: number
    so2?: number
    co?: number
    [key: string]: number | undefined
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function getAQICategory(pm25: number): { level: string; color: string; healthImplication: string } {
  if (pm25 <= 12) return { level: "Good", color: "green", healthImplication: "Air quality is satisfactory" }
  if (pm25 <= 35.4) return { level: "Moderate", color: "yellow", healthImplication: "Acceptable quality; some pollutants may affect very sensitive people" }
  if (pm25 <= 55.4) return { level: "Unhealthy for Sensitive Groups", color: "orange", healthImplication: "Sensitive groups may experience health effects" }
  if (pm25 <= 150.4) return { level: "Unhealthy", color: "red", healthImplication: "Everyone may begin to experience health effects" }
  if (pm25 <= 250.4) return { level: "Very Unhealthy", color: "purple", healthImplication: "Health alert: everyone may experience serious effects" }
  return { level: "Hazardous", color: "maroon", healthImplication: "Health emergency: entire population affected" }
}

function measurementToObservation(measurement: OpenAQMeasurement): AirQualityObservation | null {
  if (!measurement.coordinates) return null

  const provenance: Provenance = {
    source: "openaq",
    sourceId: String(measurement.locationId),
    collectedAt: new Date().toISOString(),
    url: `https://openaq.org/#/location/${measurement.locationId}`,
    reliability: measurement.isAnalysis ? 0.85 : 0.95,
    metadata: {
      entity: measurement.entity,
      sensorType: measurement.sensorType,
      isMobile: measurement.isMobile,
    },
  }

  const location: GeoLocation = {
    latitude: measurement.coordinates.latitude,
    longitude: measurement.coordinates.longitude,
    source: "gps",
  }

  return {
    id: `openaq_${measurement.locationId}_${measurement.parameter}_${Date.now()}`,
    type: "air_quality",
    entityId: `openaq_station_${measurement.locationId}`,
    location,
    observedAt: measurement.date.utc,
    receivedAt: new Date().toISOString(),
    value: measurement.value,
    unit: measurement.unit,
    values: {
      [measurement.parameter]: measurement.value,
    },
    quality: measurement.isAnalysis ? 0.85 : 0.95,
    source: "openaq",
    sourceId: String(measurement.locationId),
    provenance,
  }
}

// =============================================================================
// API CLIENT
// =============================================================================

export class OpenAQClient {
  private apiKey?: string
  private cache: Map<string, { data: AirQualityObservation[]; timestamp: number }> = new Map()
  private cacheTTL = 300000 // 5 minute cache

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAQ_API_KEY
  }

  /**
   * Fetch latest measurements
   */
  async getLatestMeasurements(query?: OpenAQQuery): Promise<AirQualityObservation[]> {
    const params = new URLSearchParams()
    
    if (query?.country) params.set("country", query.country.join(","))
    if (query?.city) params.set("city", query.city.join(","))
    if (query?.location_id) params.set("location_id", query.location_id.join(","))
    if (query?.parameter) params.set("parameter", query.parameter.join(","))
    if (query?.coordinates) {
      params.set("coordinates", `${query.coordinates.lat},${query.coordinates.lng}`)
      if (query.radius) params.set("radius", String(query.radius))
    }
    if (query?.bounds) {
      // OpenAQ uses bbox: minLng,minLat,maxLng,maxLat
      params.set("bbox", `${query.bounds.west},${query.bounds.south},${query.bounds.east},${query.bounds.north}`)
    }
    if (query?.date_from) params.set("date_from", query.date_from)
    if (query?.date_to) params.set("date_to", query.date_to)
    if (query?.isMobile !== undefined) params.set("isMobile", String(query.isMobile))
    if (query?.isAnalysis !== undefined) params.set("isAnalysis", String(query.isAnalysis))
    params.set("limit", String(query?.limit || 100))
    if (query?.page) params.set("page", String(query.page))
    params.set("sort", query?.sort || "desc")
    params.set("order_by", query?.order_by || "datetime")

    const cacheKey = params.toString()
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data
    }

    try {
      const headers: Record<string, string> = {
        "Accept": "application/json",
      }
      if (this.apiKey) {
        headers["X-API-Key"] = this.apiKey
      }

      const response = await fetch(`${OPENAQ_API_BASE}/measurements?${params.toString()}`, { headers })

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("[OpenAQ] Rate limit hit")
          return this.getSampleData()
        }
        throw new Error(`OpenAQ API error: ${response.status}`)
      }

      const data: OpenAQResponse<OpenAQMeasurement> = await response.json()
      
      const observations = data.results
        .map(measurementToObservation)
        .filter((o): o is AirQualityObservation => o !== null)

      this.cache.set(cacheKey, { data: observations, timestamp: Date.now() })
      return observations
    } catch (error) {
      console.error("[OpenAQ] API error:", error)
      return this.getSampleData()
    }
  }

  /**
   * Get locations with latest readings
   */
  async getLocations(query?: Partial<OpenAQQuery>): Promise<OpenAQLocation[]> {
    const params = new URLSearchParams()
    
    if (query?.country) params.set("country", query.country.join(","))
    if (query?.city) params.set("city", query.city.join(","))
    if (query?.parameter) params.set("parameter", query.parameter.join(","))
    if (query?.coordinates) {
      params.set("coordinates", `${query.coordinates.lat},${query.coordinates.lng}`)
      if (query?.radius) params.set("radius", String(query.radius))
    }
    params.set("limit", String(query?.limit || 100))

    try {
      const headers: Record<string, string> = { "Accept": "application/json" }
      if (this.apiKey) headers["X-API-Key"] = this.apiKey

      const response = await fetch(`${OPENAQ_API_BASE}/locations?${params.toString()}`, { headers })

      if (!response.ok) {
        throw new Error(`OpenAQ locations error: ${response.status}`)
      }

      const data: OpenAQResponse<OpenAQLocation> = await response.json()
      return data.results
    } catch (error) {
      console.error("[OpenAQ] Locations error:", error)
      return []
    }
  }

  /**
   * Get PM2.5 measurements for major cities
   */
  async getGlobalPM25(): Promise<AirQualityObservation[]> {
    return this.getLatestMeasurements({
      parameter: ["pm25"],
      limit: 100,
      isMobile: false,
    })
  }

  /**
   * Sample data for demo
   */
  private getSampleData(): AirQualityObservation[] {
    const cities = [
      { name: "Beijing", lat: 39.9, lng: 116.4, pm25: 85 },
      { name: "Delhi", lat: 28.6, lng: 77.2, pm25: 165 },
      { name: "Los Angeles", lat: 34.1, lng: -118.2, pm25: 28 },
      { name: "London", lat: 51.5, lng: -0.1, pm25: 15 },
      { name: "Tokyo", lat: 35.7, lng: 139.7, pm25: 22 },
      { name: "Sydney", lat: -33.9, lng: 151.2, pm25: 8 },
      { name: "São Paulo", lat: -23.5, lng: -46.6, pm25: 35 },
      { name: "Cairo", lat: 30.0, lng: 31.2, pm25: 95 },
      { name: "Lagos", lat: 6.5, lng: 3.4, pm25: 75 },
      { name: "Mumbai", lat: 19.1, lng: 72.9, pm25: 145 },
    ]

    return cities.map((city, idx) => ({
      id: `openaq_sample_${idx}`,
      type: "air_quality" as const,
      entityId: `openaq_station_sample_${idx}`,
      location: {
        latitude: city.lat,
        longitude: city.lng,
        source: "gps" as const,
      },
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      value: city.pm25,
      unit: "µg/m³",
      values: {
        pm25: city.pm25,
        pm10: city.pm25 * 1.5,
        o3: Math.random() * 50 + 20,
        no2: Math.random() * 40 + 10,
      },
      quality: 0.8,
      source: "openaq",
      sourceId: `sample_${idx}`,
      provenance: {
        source: "openaq",
        sourceId: `sample_${idx}`,
        collectedAt: new Date().toISOString(),
        reliability: 0.5,
        metadata: { sample: true, city: city.name },
      },
    }))
  }

  /**
   * Fetch and publish to event bus
   */
  async fetchAndPublish(query?: OpenAQQuery): Promise<{ published: number; observations: AirQualityObservation[] }> {
    const observations = await this.getLatestMeasurements(query)
    const eventBus = getEventBus()

    let published = 0
    for (const obs of observations) {
      try {
        await eventBus.publishObservation(obs)
        published++
      } catch (error) {
        console.error(`[OpenAQ] Failed to publish observation ${obs.id}:`, error)
      }
    }

    return { published, observations }
  }

  /**
   * Get AQI category for a PM2.5 value
   */
  static getAQICategory(pm25: number) {
    return getAQICategory(pm25)
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: OpenAQClient | null = null

export function getOpenAQClient(): OpenAQClient {
  if (!clientInstance) {
    clientInstance = new OpenAQClient()
  }
  return clientInstance
}
