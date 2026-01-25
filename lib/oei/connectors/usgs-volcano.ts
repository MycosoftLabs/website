/**
 * USGS Volcano Hazards Program Connector
 * 
 * Fetches volcanic activity data from USGS Volcano Hazards Program.
 * API Docs: https://volcanoes.usgs.gov/vhp/api.html
 * 
 * Data sources:
 * - Volcano alert levels and color codes
 * - Recent volcanic activity updates
 * - Current volcanic unrest notifications
 */

import type { Event, EventSeverity, GeoLocation, Provenance } from "@/types/oei"
import { getEventBus } from "../event-bus"

const USGS_VOLCANO_API = "https://volcanoes.usgs.gov/vhp/api"
const USGS_VOLCANO_CAP_FEED = "https://volcanoes.usgs.gov/vhp/updates/rss.xml"

// =============================================================================
// TYPES
// =============================================================================

interface USGSVolcano {
  vnum: string              // Volcano number
  name: string
  subregion: string
  latitude: number
  longitude: number
  elevation_m: number
  volcano_type: string
  last_eruption: string | null
  alert_level?: "Normal" | "Advisory" | "Watch" | "Warning"
  color_code?: "Green" | "Yellow" | "Orange" | "Red"
}

interface USGSVolcanoAlert {
  id: string
  volcano_id: string
  volcano_name: string
  latitude: number
  longitude: number
  alert_level: "Normal" | "Advisory" | "Watch" | "Warning"
  color_code: "Green" | "Yellow" | "Orange" | "Red"
  issued: string
  activity: string
  hazards?: string[]
  update_type: "information" | "watch" | "warning" | "advisory"
}

export interface USGSVolcanoQuery {
  region?: string          // e.g., "Alaska", "Hawaii", "Cascades"
  alertLevel?: ("Normal" | "Advisory" | "Watch" | "Warning")[]
  activeOnly?: boolean
  limit?: number
}

// =============================================================================
// VOLCANO DATA
// =============================================================================

// Monitored US volcanoes with current alert status endpoint
// Real data would come from USGS API, this is a structured approach
const MONITORED_VOLCANOES: USGSVolcano[] = [
  // Alaska
  { vnum: "311020", name: "Akutan", subregion: "Aleutian Islands", latitude: 54.134, longitude: -165.986, elevation_m: 1303, volcano_type: "Stratovolcano", last_eruption: "1992" },
  { vnum: "311180", name: "Augustine", subregion: "Cook Inlet", latitude: 59.363, longitude: -153.435, elevation_m: 1260, volcano_type: "Stratovolcano", last_eruption: "2006" },
  { vnum: "312010", name: "Cleveland", subregion: "Aleutian Islands", latitude: 52.825, longitude: -169.944, elevation_m: 1730, volcano_type: "Stratovolcano", last_eruption: "2020" },
  { vnum: "312200", name: "Pavlof", subregion: "Alaska Peninsula", latitude: 55.417, longitude: -161.894, elevation_m: 2519, volcano_type: "Stratovolcano", last_eruption: "2021" },
  { vnum: "311240", name: "Redoubt", subregion: "Cook Inlet", latitude: 60.485, longitude: -152.742, elevation_m: 3108, volcano_type: "Stratovolcano", last_eruption: "2009" },
  { vnum: "311290", name: "Shishaldin", subregion: "Unimak Island", latitude: 54.756, longitude: -163.970, elevation_m: 2857, volcano_type: "Stratovolcano", last_eruption: "2023" },
  
  // Cascades
  { vnum: "321050", name: "Mount Baker", subregion: "Washington", latitude: 48.777, longitude: -121.814, elevation_m: 3286, volcano_type: "Stratovolcano", last_eruption: "1880" },
  { vnum: "321070", name: "Glacier Peak", subregion: "Washington", latitude: 48.112, longitude: -121.113, elevation_m: 3213, volcano_type: "Stratovolcano", last_eruption: "1700" },
  { vnum: "321050", name: "Mount Rainier", subregion: "Washington", latitude: 46.853, longitude: -121.760, elevation_m: 4392, volcano_type: "Stratovolcano", last_eruption: "1894" },
  { vnum: "321080", name: "Mount St. Helens", subregion: "Washington", latitude: 46.200, longitude: -122.180, elevation_m: 2549, volcano_type: "Stratovolcano", last_eruption: "2008" },
  { vnum: "322010", name: "Mount Hood", subregion: "Oregon", latitude: 45.374, longitude: -121.696, elevation_m: 3426, volcano_type: "Stratovolcano", last_eruption: "1866" },
  { vnum: "322110", name: "Crater Lake", subregion: "Oregon", latitude: 42.93, longitude: -122.12, elevation_m: 2487, volcano_type: "Caldera", last_eruption: "-2850" },
  { vnum: "323020", name: "Mount Shasta", subregion: "California", latitude: 41.409, longitude: -122.193, elevation_m: 4317, volcano_type: "Stratovolcano", last_eruption: "1786" },
  { vnum: "323100", name: "Long Valley Caldera", subregion: "California", latitude: 37.70, longitude: -118.87, elevation_m: 3390, volcano_type: "Caldera", last_eruption: "1350" },
  
  // Hawaii
  { vnum: "332010", name: "Kilauea", subregion: "Hawaii", latitude: 19.421, longitude: -155.287, elevation_m: 1222, volcano_type: "Shield", last_eruption: "2023" },
  { vnum: "332020", name: "Mauna Loa", subregion: "Hawaii", latitude: 19.475, longitude: -155.608, elevation_m: 4169, volcano_type: "Shield", last_eruption: "2022" },
  
  // Yellowstone
  { vnum: "325010", name: "Yellowstone", subregion: "Wyoming", latitude: 44.43, longitude: -110.67, elevation_m: 2805, volcano_type: "Caldera", last_eruption: "-70000" },
]

// =============================================================================
// HELPERS
// =============================================================================

function mapAlertLevelToSeverity(alertLevel: string): EventSeverity {
  switch (alertLevel) {
    case "Warning":
      return "critical"
    case "Watch":
      return "high"
    case "Advisory":
      return "medium"
    case "Normal":
      return "info"
    default:
      return "info"
  }
}

function volcanoAlertToOEIEvent(alert: USGSVolcanoAlert): Event {
  const provenance: Provenance = {
    source: "usgs",
    sourceId: alert.id,
    collectedAt: new Date().toISOString(),
    url: `https://volcanoes.usgs.gov/volcanoes/${alert.volcano_id}/`,
    reliability: 1.0,
    metadata: {
      volcano_id: alert.volcano_id,
      color_code: alert.color_code,
      update_type: alert.update_type,
    },
  }

  const location: GeoLocation = {
    latitude: alert.latitude,
    longitude: alert.longitude,
    source: "manual",
  }

  return {
    id: `usgs_volcano_${String(alert.id).replace(/[^a-zA-Z0-9]/g, "_")}`,
    type: "volcanic_activity",
    severity: mapAlertLevelToSeverity(alert.alert_level),
    title: `${alert.volcano_name} - ${alert.alert_level} Alert`,
    description: alert.activity,
    details: {
      volcanoName: alert.volcano_name,
      alertLevel: alert.alert_level,
      colorCode: alert.color_code,
      activity: alert.activity,
      hazards: alert.hazards,
      usgsVolcanoId: alert.volcano_id,
    },
    location,
    occurredAt: alert.issued,
    detectedAt: alert.issued,
    status: alert.alert_level === "Normal" ? "resolved" : "active",
    provenance,
    actions: [
      {
        id: "view_usgs",
        type: "custom",
        label: "View on USGS",
        url: `https://volcanoes.usgs.gov/volcanoes/${alert.volcano_id}/`,
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

export class USGSVolcanoClient {
  /**
   * Fetch current volcano alert status
   * Note: In production, this would use the actual USGS API
   * For now, we simulate with known data structure
   */
  async fetchVolcanoAlerts(query?: USGSVolcanoQuery): Promise<Event[]> {
    // In production, would fetch from: https://volcanoes.usgs.gov/vhp/api/volcanoStatus
    // For now, generate events based on monitored volcanoes with elevated status
    
    const events: Event[] = []
    const now = new Date().toISOString()
    
    // Simulate fetching current status - in production this comes from USGS
    // For development, we can simulate alerts for demonstration
    
    let volcanoes = [...MONITORED_VOLCANOES]
    
    if (query?.region) {
      volcanoes = volcanoes.filter(v => 
        v.subregion.toLowerCase().includes(query.region!.toLowerCase())
      )
    }
    
    if (query?.activeOnly) {
      // Filter to only those with known recent activity
      const activeVolcanoes = ["Kilauea", "Mauna Loa", "Shishaldin", "Pavlof", "Cleveland"]
      volcanoes = volcanoes.filter(v => activeVolcanoes.includes(v.name))
    }
    
    if (query?.limit) {
      volcanoes = volcanoes.slice(0, query.limit)
    }

    // Convert to events (in production, would have actual alert data)
    for (const volcano of volcanoes) {
      // Check if volcano has elevated status (simulated for development)
      const alertLevel = volcano.alert_level || "Normal"
      const colorCode = volcano.color_code || "Green"
      
      if (alertLevel !== "Normal" || query?.alertLevel?.includes("Normal")) {
        const alert: USGSVolcanoAlert = {
          id: `${volcano.vnum}_${Date.now()}`,
          volcano_id: volcano.vnum,
          volcano_name: volcano.name,
          latitude: volcano.latitude,
          longitude: volcano.longitude,
          alert_level: alertLevel,
          color_code: colorCode,
          issued: now,
          activity: `${volcano.name} is at ${alertLevel} alert level with ${colorCode} aviation color code.`,
          hazards: alertLevel !== "Normal" ? ["Ash emissions", "Lava flows"] : undefined,
          update_type: "information",
        }
        
        events.push(volcanoAlertToOEIEvent(alert))
      }
    }

    return events
  }

  /**
   * Fetch all monitored volcanoes (not just alerts)
   */
  async fetchMonitoredVolcanoes(): Promise<USGSVolcano[]> {
    return MONITORED_VOLCANOES
  }

  /**
   * Fetch volcano info by ID
   */
  async fetchVolcano(volcanoId: string): Promise<USGSVolcano | null> {
    return MONITORED_VOLCANOES.find(v => v.vnum === volcanoId) || null
  }

  /**
   * Fetch and publish alerts to event bus
   */
  async fetchAndPublish(query?: USGSVolcanoQuery): Promise<{ published: number; events: Event[] }> {
    const events = await this.fetchVolcanoAlerts(query)
    const eventBus = getEventBus()

    let published = 0
    for (const event of events) {
      if (event.severity !== "info") {  // Only publish elevated alerts
        try {
          await eventBus.publishEvent(event)
          published++
        } catch (error) {
          console.error(`[USGS Volcano] Failed to publish event ${event.id}:`, error)
        }
      }
    }

    return { published, events }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: USGSVolcanoClient | null = null

export function getUSGSVolcanoClient(): USGSVolcanoClient {
  if (!clientInstance) {
    clientInstance = new USGSVolcanoClient()
  }
  return clientInstance
}
