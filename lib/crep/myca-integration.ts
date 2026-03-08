/**
 * MYCA-CREP Bidirectional Integration Bridge
 *
 * Connects MYCA AI capabilities with the CREP dashboard for:
 *
 * MYCA → CREP:
 * - Voice commands for map navigation (fly to, zoom, pan)
 * - Natural language entity queries ("show me aircraft near San Diego")
 * - AI-driven layer control ("enable weather layers")
 * - Mission creation and management via conversation
 * - Entity analysis and identification
 *
 * CREP → MYCA:
 * - Entity context for AI conversations ("tell me about this aircraft")
 * - Map viewport context for location-aware responses
 * - Event notifications for AI processing
 * - Sensor data summaries from devices
 * - Anomaly detection alerts
 *
 * Integrates with PersonaPlex for voice control on the map.
 */

import type { UnifiedEntity } from "@/lib/crep/entities/unified-entity-schema"
import type { MYCAMessage, MYCASendOptions } from "@/contexts/myca-context"
import type { CREPMapState, MissionContext, LayerVisibility } from "@/contexts/crep-context"
import { getEntityCoordinates } from "@/lib/crep/entities/entity-converters"

// ============================================================================
// MYCA → CREP: Command Types
// ============================================================================

export type CREPCommandType =
  | "fly_to"
  | "zoom"
  | "pan"
  | "reset_view"
  | "show_layer"
  | "hide_layer"
  | "toggle_layer"
  | "select_entity"
  | "filter_entities"
  | "create_mission"
  | "update_mission"
  | "search_entities"
  | "get_entity_details"
  | "get_view_context"
  | "get_system_status"
  | "analyze_area"
  | "track_entity"

export interface CREPCommand {
  type: CREPCommandType
  params: Record<string, unknown>
  source: "myca" | "voice" | "search"
  timestamp: string
}

export interface CREPCommandResult {
  success: boolean
  message: string
  data?: unknown
}

// ============================================================================
// CREP → MYCA: Context Types
// ============================================================================

export interface CREPContextForMYCA {
  /** Current map viewport */
  viewport: {
    center: [number, number]
    zoom: number
    bounds?: { north: number; south: number; east: number; west: number }
  }
  /** Summary of visible entities */
  entitySummary: {
    aircraft: number
    vessels: number
    satellites: number
    fungalObservations: number
    globalEvents: number
    devices: number
    total: number
  }
  /** Active mission context */
  mission?: {
    name: string
    type: string
    objective: string
    status: string
  }
  /** Active layers */
  activeLayers: string[]
  /** Recent events (last 5) */
  recentEvents: Array<{
    type: string
    title: string
    severity: string
    timestamp: string
  }>
  /** Selected entity details */
  selectedEntity?: {
    id: string
    type: string
    properties: Record<string, unknown>
    coordinates: [number, number] | null
  }
  /** Stream connection status */
  streamStatus: string
}

// ============================================================================
// Command Parser — Extracts CREP commands from MYCA responses
// ============================================================================

/** Parse MYCA natural language into CREP commands */
export function parseMYCACommandForCREP(
  text: string,
  currentContext?: CREPContextForMYCA
): CREPCommand | null {
  const lower = text.toLowerCase().trim()

  // Map navigation commands
  if (/\b(fly\s*to|go\s*to|navigate\s*to|show\s*me|zoom\s*to)\b/i.test(lower)) {
    // Extract location from text
    const locationMatch = lower.match(
      /(?:fly\s*to|go\s*to|navigate\s*to|show\s*me|zoom\s*to)\s+(.+?)(?:\.|$)/i
    )
    if (locationMatch) {
      return {
        type: "fly_to",
        params: { query: locationMatch[1].trim() },
        source: "myca",
        timestamp: new Date().toISOString(),
      }
    }
  }

  // Zoom commands
  if (/\b(zoom\s*in|zoom\s*out|zoom\s*level)\b/i.test(lower)) {
    const zoomIn = /zoom\s*in/i.test(lower)
    const levelMatch = lower.match(/zoom\s*(?:level\s*)?(\d+)/i)
    return {
      type: "zoom",
      params: levelMatch
        ? { level: parseInt(levelMatch[1]) }
        : { delta: zoomIn ? 2 : -2 },
      source: "myca",
      timestamp: new Date().toISOString(),
    }
  }

  // Layer commands
  const layerMatch = lower.match(
    /\b(show|hide|enable|disable|toggle|turn\s*on|turn\s*off)\b.*?\b(aircraft|vessels?|ships?|satellites?|weather|wind|precipitation|clouds?|fungal|mushroom|devices?|events?|trajectories?|fire|storms?|spore|pressure|humidity)\b/i
  )
  if (layerMatch) {
    const action = layerMatch[1].toLowerCase()
    const show = /show|enable|turn\s*on/i.test(action)
    const hide = /hide|disable|turn\s*off/i.test(action)

    const layerMap: Record<string, keyof LayerVisibility> = {
      aircraft: "aircraft",
      vessel: "vessels",
      vessels: "vessels",
      ship: "vessels",
      ships: "vessels",
      satellite: "satellites",
      satellites: "satellites",
      weather: "weather",
      wind: "wind",
      precipitation: "precipitation",
      cloud: "clouds",
      clouds: "clouds",
      fungal: "fungalObservations",
      mushroom: "fungalObservations",
      device: "devices",
      devices: "devices",
      event: "globalEvents",
      events: "globalEvents",
      trajectory: "trajectories",
      trajectories: "trajectories",
      fire: "fire",
      storm: "stormCells",
      storms: "stormCells",
      spore: "sporeDispersal",
      pressure: "pressure",
      humidity: "humidity",
    }

    const layerKey = layerMap[layerMatch[2].toLowerCase()]
    if (layerKey) {
      return {
        type: show ? "show_layer" : hide ? "hide_layer" : "toggle_layer",
        params: { layer: layerKey },
        source: "myca",
        timestamp: new Date().toISOString(),
      }
    }
  }

  // Entity search commands
  if (/\b(find|search|locate|where\s*is|where\s*are)\b/i.test(lower)) {
    return {
      type: "search_entities",
      params: { query: lower },
      source: "myca",
      timestamp: new Date().toISOString(),
    }
  }

  // Status/context commands
  if (/\b(status|what.*seeing|what.*visible|view\s*context|system\s*status)\b/i.test(lower)) {
    return {
      type: "get_system_status",
      params: {},
      source: "myca",
      timestamp: new Date().toISOString(),
    }
  }

  // Mission commands
  if (/\b(create|start|begin|new)\s*(mission|operation|task)\b/i.test(lower)) {
    const nameMatch = lower.match(/(?:called|named)\s+"?(.+?)"?(?:\s|$)/i)
    return {
      type: "create_mission",
      params: {
        name: nameMatch?.[1] || undefined,
        query: lower,
      },
      source: "myca",
      timestamp: new Date().toISOString(),
    }
  }

  // Reset commands
  if (/\b(reset|default|home)\s*(view|map|position)?\b/i.test(lower)) {
    return {
      type: "reset_view",
      params: {},
      source: "myca",
      timestamp: new Date().toISOString(),
    }
  }

  return null
}

// ============================================================================
// Context Builder — Builds CREP context for MYCA conversations
// ============================================================================

/** Build context string for MYCA about current CREP state */
export function buildCREPContextForMYCA(context: CREPContextForMYCA): string {
  const parts: string[] = []

  // Viewport context
  parts.push(
    `CREP Dashboard viewport: center [${context.viewport.center[0].toFixed(2)}, ${context.viewport.center[1].toFixed(2)}], zoom ${context.viewport.zoom.toFixed(1)}`
  )

  // Entity summary
  const { entitySummary } = context
  const entityParts: string[] = []
  if (entitySummary.aircraft > 0) entityParts.push(`${entitySummary.aircraft} aircraft`)
  if (entitySummary.vessels > 0) entityParts.push(`${entitySummary.vessels} vessels`)
  if (entitySummary.satellites > 0) entityParts.push(`${entitySummary.satellites} satellites`)
  if (entitySummary.fungalObservations > 0) entityParts.push(`${entitySummary.fungalObservations} fungal observations`)
  if (entitySummary.globalEvents > 0) entityParts.push(`${entitySummary.globalEvents} global events`)
  if (entitySummary.devices > 0) entityParts.push(`${entitySummary.devices} MycoBrain devices`)
  if (entityParts.length > 0) {
    parts.push(`Visible entities: ${entityParts.join(", ")} (${entitySummary.total} total)`)
  }

  // Mission context
  if (context.mission) {
    parts.push(
      `Active mission: "${context.mission.name}" (${context.mission.type}) - ${context.mission.status}: ${context.mission.objective}`
    )
  }

  // Active layers
  if (context.activeLayers.length > 0) {
    parts.push(`Active layers: ${context.activeLayers.join(", ")}`)
  }

  // Selected entity
  if (context.selectedEntity) {
    const { selectedEntity } = context
    parts.push(
      `Selected entity: ${selectedEntity.type} "${selectedEntity.id}" at [${selectedEntity.coordinates?.join(", ") || "unknown"}]`
    )
  }

  // Recent events
  if (context.recentEvents.length > 0) {
    const eventSummary = context.recentEvents
      .map((e) => `${e.type}: ${e.title} (${e.severity})`)
      .join("; ")
    parts.push(`Recent events: ${eventSummary}`)
  }

  // Stream status
  parts.push(`Stream status: ${context.streamStatus}`)

  return parts.join("\n")
}

/** Build context for a specific entity to send to MYCA */
export function buildEntityContextForMYCA(entity: UnifiedEntity): string {
  const coords = getEntityCoordinates(entity)
  const parts: string[] = [
    `Entity type: ${entity.type}`,
    `ID: ${entity.id}`,
    `Source: ${entity.source}`,
    `Observed at: ${entity.time.observed_at}`,
  ]

  if (coords) {
    parts.push(`Location: [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`)
  }

  if (entity.state.altitude !== undefined) {
    parts.push(`Altitude: ${entity.state.altitude}`)
  }

  if (entity.state.heading !== undefined) {
    parts.push(`Heading: ${entity.state.heading}°`)
  }

  // Add type-specific properties
  const props = entity.properties
  switch (entity.type) {
    case "aircraft":
      if (props.callsign) parts.push(`Callsign: ${props.callsign}`)
      if (props.airline) parts.push(`Airline: ${props.airline}`)
      if (props.origin && props.destination) {
        parts.push(`Route: ${props.origin} → ${props.destination}`)
      }
      break
    case "vessel":
      if (props.name) parts.push(`Name: ${props.name}`)
      if (props.mmsi) parts.push(`MMSI: ${props.mmsi}`)
      if (props.destination) parts.push(`Destination: ${props.destination}`)
      break
    case "satellite":
      if (props.name) parts.push(`Name: ${props.name}`)
      if (props.orbitType) parts.push(`Orbit: ${props.orbitType}`)
      break
    case "fungal":
      if (props.species) parts.push(`Species: ${props.species}`)
      if (props.location) parts.push(`Location: ${props.location}`)
      break
    case "device":
      if (props.name) parts.push(`Device: ${props.name}`)
      if (props.status) parts.push(`Status: ${props.status}`)
      break
  }

  return parts.join("\n")
}

// ============================================================================
// MYCA Voice Command Definitions for CREP
// ============================================================================

export const CREP_VOICE_COMMANDS = [
  { pattern: "fly to *", description: "Navigate map to a location" },
  { pattern: "zoom in/out", description: "Adjust map zoom level" },
  { pattern: "show/hide [layer]", description: "Toggle map layers" },
  { pattern: "what am I looking at", description: "Get CREP viewport context" },
  { pattern: "tell me about this [entity]", description: "Get entity details" },
  { pattern: "find [entity type] near *", description: "Search for entities" },
  { pattern: "create mission *", description: "Start a new CREP mission" },
  { pattern: "system status", description: "Get CREP system health" },
  { pattern: "reset view", description: "Reset map to default position" },
] as const
