/**
 * NWS (National Weather Service) Alerts Connector
 * 
 * Fetches weather alerts from the NWS API and converts to OEI Event format.
 * API Docs: https://www.weather.gov/documentation/services-web-api
 * 
 * No API key required - public API with User-Agent requirement.
 */

import type { Event, EventSeverity, GeoLocation, GeoBounds, Provenance } from "@/types/oei"
import { getEventBus } from "../event-bus"

const NWS_API_BASE = "https://api.weather.gov"
const USER_AGENT = "NatureOS/1.0 (contact@mycosoft.io)"

// =============================================================================
// TYPES
// =============================================================================

interface NWSAlert {
  id: string
  type: "Feature"
  geometry: {
    type: "Polygon" | "MultiPolygon"
    coordinates: number[][][]
  } | null
  properties: {
    "@id": string
    "@type": string
    id: string
    areaDesc: string
    geocode: {
      SAME?: string[]
      UGC?: string[]
    }
    affectedZones: string[]
    references: { identifier: string }[]
    sent: string
    effective: string
    onset: string | null
    expires: string
    ends: string | null
    status: "Actual" | "Exercise" | "System" | "Test" | "Draft"
    messageType: "Alert" | "Update" | "Cancel"
    category: string
    severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown"
    certainty: "Observed" | "Likely" | "Possible" | "Unlikely" | "Unknown"
    urgency: "Immediate" | "Expected" | "Future" | "Past" | "Unknown"
    event: string
    sender: string
    senderName: string
    headline: string | null
    description: string
    instruction: string | null
    response: string
    parameters: Record<string, string[]>
  }
}

interface NWSAlertsResponse {
  "@context": unknown
  type: "FeatureCollection"
  features: NWSAlert[]
  title: string
  updated: string
}

export interface NWSAlertQuery {
  area?: string          // State code or marine zone
  point?: string         // lat,lon
  region?: string        // Land or marine region
  regionType?: string    // "land" or "marine"
  zone?: string[]        // Forecast zone IDs
  urgency?: string[]     // Immediate, Expected, Future, Past, Unknown
  severity?: string[]    // Extreme, Severe, Moderate, Minor, Unknown
  certainty?: string[]   // Observed, Likely, Possible, Unlikely, Unknown
  event?: string[]       // Event types
  messageType?: string[] // Alert, Update, Cancel
  status?: string[]      // Actual, Exercise, System, Test, Draft
  limit?: number
}

// =============================================================================
// HELPERS
// =============================================================================

function mapSeverity(nwsSeverity: string): EventSeverity {
  switch (nwsSeverity) {
    case "Extreme":
      return "critical"
    case "Severe":
      return "high"
    case "Moderate":
      return "medium"
    case "Minor":
      return "low"
    default:
      return "info"
  }
}

function calculateCentroid(geometry: NWSAlert["geometry"]): GeoLocation | undefined {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
    return undefined
  }

  try {
    // For polygon, use first ring
    let coords: number[][] = []
    
    if (geometry.type === "Polygon") {
      coords = geometry.coordinates[0]
    } else if (geometry.type === "MultiPolygon") {
      // Use first polygon's first ring
      coords = geometry.coordinates[0]?.[0] || []
    }

    if (coords.length === 0) return undefined

    // Calculate centroid
    let sumLon = 0
    let sumLat = 0
    for (const [lon, lat] of coords) {
      sumLon += lon
      sumLat += lat
    }

    return {
      longitude: sumLon / coords.length,
      latitude: sumLat / coords.length,
      source: "estimated",
    }
  } catch {
    return undefined
  }
}

function calculateBounds(geometry: NWSAlert["geometry"]): GeoBounds | undefined {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
    return undefined
  }

  try {
    let allCoords: number[][] = []
    
    if (geometry.type === "Polygon") {
      allCoords = geometry.coordinates[0]
    } else if (geometry.type === "MultiPolygon") {
      // Flatten all coordinates
      for (const polygon of geometry.coordinates) {
        for (const ring of polygon) {
          allCoords = allCoords.concat(ring)
        }
      }
    }

    if (allCoords.length === 0) return undefined

    let minLon = Infinity
    let maxLon = -Infinity
    let minLat = Infinity
    let maxLat = -Infinity

    for (const [lon, lat] of allCoords) {
      minLon = Math.min(minLon, lon)
      maxLon = Math.max(maxLon, lon)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    }

    return {
      north: maxLat,
      south: minLat,
      east: maxLon,
      west: minLon,
    }
  } catch {
    return undefined
  }
}

function nwsAlertToOEIEvent(alert: NWSAlert): Event {
  const props = alert.properties
  
  const provenance: Provenance = {
    source: "nws",
    sourceId: props.id,
    collectedAt: new Date().toISOString(),
    url: props["@id"],
    reliability: props.certainty === "Observed" ? 1.0 : props.certainty === "Likely" ? 0.8 : 0.6,
    metadata: {
      sender: props.sender,
      senderName: props.senderName,
      messageType: props.messageType,
      status: props.status,
    },
  }

  return {
    id: `nws_${String(props.id).replace(/[^a-zA-Z0-9]/g, "_")}`,
    type: "weather_alert",
    severity: mapSeverity(props.severity),
    title: props.headline || props.event,
    description: props.description,
    details: {
      alertType: props.event,
      phenomenon: props.category,
      significance: props.severity,
      certainty: props.certainty,
      urgency: props.urgency,
      response: props.response,
      instruction: props.instruction,
      headline: props.headline,
      areaDescription: props.areaDesc,
      affectedZones: props.affectedZones,
      geocodes: props.geocode,
    },
    location: calculateCentroid(alert.geometry),
    affectedArea: calculateBounds(alert.geometry),
    occurredAt: props.onset || props.effective,
    detectedAt: props.sent,
    expiresAt: props.expires,
    status: props.messageType === "Cancel" ? "resolved" : 
            new Date(props.expires) < new Date() ? "expired" : "active",
    provenance,
    actions: [
      {
        id: "view_nws",
        type: "custom",
        label: "View on NWS",
        url: props["@id"],
      },
      {
        id: "acknowledge",
        type: "acknowledge",
        label: "Acknowledge",
      },
    ],
  }
}

// =============================================================================
// API CLIENT
// =============================================================================

export class NWSAlertsClient {
  private userAgent: string

  constructor(userAgent = USER_AGENT) {
    this.userAgent = userAgent
  }

  /**
   * Fetch active alerts with optional filters
   */
  async fetchAlerts(query?: NWSAlertQuery): Promise<Event[]> {
    const params = new URLSearchParams()

    if (query?.area) params.set("area", query.area)
    if (query?.point) params.set("point", query.point)
    if (query?.region) params.set("region", query.region)
    if (query?.regionType) params.set("region_type", query.regionType)
    if (query?.zone) params.set("zone", query.zone.join(","))
    if (query?.urgency) params.set("urgency", query.urgency.join(","))
    if (query?.severity) params.set("severity", query.severity.join(","))
    if (query?.certainty) params.set("certainty", query.certainty.join(","))
    if (query?.event) params.set("event", query.event.join(","))
    if (query?.messageType) params.set("message_type", query.messageType.join(","))
    if (query?.status) params.set("status", query.status.join(","))
    if (query?.limit) params.set("limit", String(query.limit))

    const url = `${NWS_API_BASE}/alerts/active?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        "User-Agent": this.userAgent,
        "Accept": "application/geo+json",
      },
    })

    if (!response.ok) {
      throw new Error(`NWS API error: ${response.status} ${response.statusText}`)
    }

    const data: NWSAlertsResponse = await response.json()
    return data.features.map(nwsAlertToOEIEvent)
  }

  /**
   * Fetch alerts for a specific state
   */
  async fetchAlertsForState(stateCode: string): Promise<Event[]> {
    return this.fetchAlerts({ area: stateCode.toUpperCase() })
  }

  /**
   * Fetch alerts for a specific point
   */
  async fetchAlertsForPoint(lat: number, lon: number): Promise<Event[]> {
    return this.fetchAlerts({ point: `${lat},${lon}` })
  }

  /**
   * Fetch severe alerts only (Extreme or Severe)
   */
  async fetchSevereAlerts(): Promise<Event[]> {
    return this.fetchAlerts({ severity: ["Extreme", "Severe"] })
  }

  /**
   * Fetch and publish alerts to event bus
   */
  async fetchAndPublish(query?: NWSAlertQuery): Promise<{ published: number; events: Event[] }> {
    const events = await this.fetchAlerts(query)
    const eventBus = getEventBus()

    let published = 0
    for (const event of events) {
      try {
        await eventBus.publishEvent(event)
        published++
      } catch (error) {
        console.error(`[NWS] Failed to publish event ${event.id}:`, error)
      }
    }

    return { published, events }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: NWSAlertsClient | null = null

export function getNWSAlertsClient(): NWSAlertsClient {
  if (!clientInstance) {
    clientInstance = new NWSAlertsClient()
  }
  return clientInstance
}
