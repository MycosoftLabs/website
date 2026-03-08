/**
 * Entity Converters - Unified Data Model
 *
 * Converts all CREP data formats into the canonical UnifiedEntity schema.
 * Eliminates `as any` casts by providing proper type-safe converters for
 * every data source format (API responses, WebSocket, MINDEX, etc.)
 *
 * All location data flows through GeoJSON Point geometry [lng, lat].
 */

import type {
  UnifiedEntity,
  UnifiedPointGeometry,
  UnifiedEntityState,
  UnifiedEntityTime,
} from "./unified-entity-schema"
import type { AircraftEntity, VesselEntity, SatelliteEntity } from "@/types/oei"
import type { Aircraft, Vessel, Satellite, GlobalEvent, FungalObservation, Device } from "../crep-data-service"

// ============================================================================
// Coordinate Helpers
// ============================================================================

/** Validate that coordinates are within valid WGS84 bounds */
export function isValidCoordinate(lng: number, lat: number): boolean {
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    !isNaN(lng) &&
    !isNaN(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  )
}

/** Extract [lng, lat] from any known location format, returns null if invalid */
export function extractCoordinates(
  location: unknown
): [number, number] | null {
  if (!location || typeof location !== "object") return null

  const loc = location as Record<string, unknown>

  // GeoJSON format: { type: "Point", coordinates: [lng, lat] }
  if (loc.type === "Point" && Array.isArray(loc.coordinates)) {
    const [lng, lat] = loc.coordinates as number[]
    if (isValidCoordinate(lng, lat)) return [lng, lat]
  }

  // { longitude, latitude } format (OEI entities)
  if (typeof loc.longitude === "number" && typeof loc.latitude === "number") {
    if (isValidCoordinate(loc.longitude, loc.latitude)) {
      return [loc.longitude, loc.latitude]
    }
  }

  // { lng, lat } format (CREP data service)
  if (typeof loc.lng === "number" && typeof loc.lat === "number") {
    if (isValidCoordinate(loc.lng, loc.lat)) return [loc.lng, loc.lat]
  }

  return null
}

/** Create a valid UnifiedPointGeometry from coordinates */
export function makePoint(
  lng: number,
  lat: number,
  alt?: number
): UnifiedPointGeometry {
  return {
    type: "Point",
    coordinates: alt !== undefined ? [lng, lat, alt] : [lng, lat],
  }
}

// ============================================================================
// Aircraft Converters
// ============================================================================

/** Convert crep-data-service Aircraft (lat/lng) to UnifiedEntity */
export function convertSimpleAircraft(a: Aircraft): UnifiedEntity | null {
  if (!isValidCoordinate(a.lng, a.lat)) return null

  return {
    id: a.id,
    type: "aircraft",
    geometry: makePoint(a.lng, a.lat, a.altitude),
    state: {
      velocity: { x: a.speed || 0, y: 0 },
      heading: a.heading,
      altitude: a.altitude,
      classification: a.type || "unknown",
    },
    time: {
      observed_at: new Date().toISOString(),
      valid_from: new Date().toISOString(),
    },
    confidence: 0.8,
    source: "flightradar24",
    properties: {
      callsign: a.callsign,
      origin: a.origin,
      destination: a.destination,
      aircraftType: a.type,
    },
    s2_cell: "",
  }
}

/** Convert OEI AircraftEntity (GeoJSON location) to UnifiedEntity */
export function convertAircraftEntity(a: AircraftEntity): UnifiedEntity | null {
  const coords = extractCoordinates(a.location)
  if (!coords) return null

  return {
    id: a.id,
    type: "aircraft",
    geometry: makePoint(coords[0], coords[1], a.altitude ?? undefined),
    state: {
      velocity: { x: a.velocity ?? 0, y: a.verticalRate ?? 0 },
      heading: a.heading ?? undefined,
      altitude: a.altitude ?? undefined,
      classification: a.aircraftType || "unknown",
    },
    time: {
      observed_at: a.lastSeen,
      valid_from: a.lastSeen,
    },
    confidence: a.provenance?.reliability ?? 0.8,
    source: a.provenance?.source || "opensky",
    properties: {
      icao24: a.icao24,
      callsign: a.callsign,
      origin: a.origin,
      destination: a.destination,
      airline: a.airline,
      flightNumber: a.flightNumber,
      registration: a.registration,
      onGround: a.onGround,
      squawk: a.squawk,
    },
    s2_cell: "",
  }
}

// ============================================================================
// Vessel Converters
// ============================================================================

/** Convert crep-data-service Vessel (lat/lng) to UnifiedEntity */
export function convertSimpleVessel(v: Vessel): UnifiedEntity | null {
  if (!isValidCoordinate(v.lng, v.lat)) return null

  return {
    id: v.id,
    type: "vessel",
    geometry: makePoint(v.lng, v.lat),
    state: {
      velocity: { x: v.speed || 0, y: 0 },
      heading: v.heading,
      classification: v.type || "cargo",
    },
    time: {
      observed_at: new Date().toISOString(),
      valid_from: new Date().toISOString(),
    },
    confidence: 0.8,
    source: "aisstream",
    properties: {
      mmsi: v.mmsi,
      name: v.name,
      destination: v.destination,
      shipType: v.type,
    },
    s2_cell: "",
  }
}

/** Convert OEI VesselEntity (GeoJSON location) to UnifiedEntity */
export function convertVesselEntity(v: VesselEntity): UnifiedEntity | null {
  const coords = extractCoordinates(v.location)
  if (!coords) return null

  return {
    id: v.id,
    type: "vessel",
    geometry: makePoint(coords[0], coords[1]),
    state: {
      velocity: { x: v.sog ?? 0, y: 0 },
      heading: v.heading ?? v.cog ?? undefined,
      classification: String(v.shipType || "unknown"),
    },
    time: {
      observed_at: v.lastSeen,
      valid_from: v.lastSeen,
    },
    confidence: v.provenance?.reliability ?? 0.8,
    source: v.provenance?.source || "aisstream",
    properties: {
      mmsi: v.mmsi,
      name: v.name,
      imo: v.imo,
      callsign: v.callsign,
      flag: v.flag,
      destination: v.destination,
      navStatus: v.navStatus,
      length: v.length,
      width: v.width,
      draught: v.draught,
    },
    s2_cell: "",
  }
}

// ============================================================================
// Satellite Converters
// ============================================================================

/** Convert crep-data-service Satellite (lat/lng) to UnifiedEntity */
export function convertSimpleSatellite(s: Satellite): UnifiedEntity | null {
  if (!isValidCoordinate(s.lng, s.lat)) return null

  return {
    id: s.id,
    type: "satellite",
    geometry: makePoint(s.lng, s.lat, s.altitude),
    state: {
      velocity: { x: s.velocity || 0, y: 0 },
      altitude: s.altitude,
      classification: s.category || "active",
    },
    time: {
      observed_at: new Date().toISOString(),
      valid_from: new Date().toISOString(),
    },
    confidence: 0.7,
    source: "celestrak",
    properties: {
      name: s.name,
      noradId: s.noradId,
      category: s.category,
    },
    s2_cell: "",
  }
}

/** Convert OEI SatelliteEntity to UnifiedEntity */
export function convertSatelliteEntity(s: SatelliteEntity): UnifiedEntity | null {
  const pos = s.estimatedPosition
  if (!pos || !isValidCoordinate(pos.longitude, pos.latitude)) return null

  return {
    id: s.id,
    type: "satellite",
    geometry: makePoint(pos.longitude, pos.latitude, pos.altitude),
    state: {
      altitude: pos.altitude,
      classification: s.orbitType || "UNKNOWN",
    },
    time: {
      observed_at: s.lastSeen,
      valid_from: s.lastSeen,
    },
    confidence: 0.7,
    source: s.provenance?.source || "celestrak",
    properties: {
      name: s.name,
      noradId: s.noradId,
      intlDesignator: s.intlDesignator,
      objectType: s.objectType,
      country: s.country,
      orbitType: s.orbitType,
      orbitalParams: s.orbitalParams,
      launchDate: s.launchDate,
    },
    s2_cell: "",
  }
}

// ============================================================================
// Event Converters
// ============================================================================

/** Convert crep-data-service GlobalEvent to UnifiedEntity */
export function convertGlobalEvent(e: GlobalEvent): UnifiedEntity | null {
  if (!isValidCoordinate(e.lng, e.lat)) return null

  return {
    id: e.id,
    type: "weather", // events are typed as weather/earthquake based on e.type
    geometry: makePoint(e.lng, e.lat),
    state: {
      classification: e.type,
    },
    time: {
      observed_at: e.timestamp || new Date().toISOString(),
      valid_from: e.timestamp || new Date().toISOString(),
    },
    confidence: 0.9,
    source: "global-events",
    properties: {
      title: e.title,
      severity: e.severity,
      eventType: e.type,
    },
    s2_cell: "",
  }
}

// ============================================================================
// Fungal Observation Converters
// ============================================================================

/** Convert crep-data-service FungalObservation to UnifiedEntity */
export function convertFungalObservation(f: FungalObservation): UnifiedEntity | null {
  if (!isValidCoordinate(f.lng, f.lat)) return null

  return {
    id: f.id,
    type: "fungal",
    geometry: makePoint(f.lng, f.lat),
    state: {
      classification: f.species,
    },
    time: {
      observed_at: f.observedOn || new Date().toISOString(),
      valid_from: f.observedOn || new Date().toISOString(),
    },
    confidence: 0.75,
    source: "mindex",
    properties: {
      species: f.species,
      location: f.location,
      observedOn: f.observedOn,
    },
    s2_cell: "",
  }
}

// ============================================================================
// Device Converters
// ============================================================================

/** Convert crep-data-service Device to UnifiedEntity */
export function convertDevice(d: Device): UnifiedEntity | null {
  if (!d.lat || !d.lng || !isValidCoordinate(d.lng, d.lat)) return null

  return {
    id: d.id,
    type: "device",
    geometry: makePoint(d.lng, d.lat),
    state: {
      classification: d.type || "mycobrain",
    },
    time: {
      observed_at: d.lastSeen || new Date().toISOString(),
      valid_from: d.lastSeen || new Date().toISOString(),
    },
    confidence: d.status === "online" ? 1.0 : 0.5,
    source: "mycobrain",
    properties: {
      name: d.name,
      type: d.type,
      status: d.status,
    },
    s2_cell: "",
  }
}

// ============================================================================
// Batch Converters
// ============================================================================

/** Convert arrays of any entity type, filtering out invalid entries */
export function convertBatch<T>(
  items: T[],
  converter: (item: T) => UnifiedEntity | null
): UnifiedEntity[] {
  const results: UnifiedEntity[] = []
  for (const item of items) {
    const entity = converter(item)
    if (entity) results.push(entity)
  }
  return results
}

/** Get [lng, lat] from a UnifiedEntity, returns null if not a Point */
export function getEntityCoordinates(entity: UnifiedEntity): [number, number] | null {
  if (entity.geometry.type !== "Point") return null
  const [lng, lat] = entity.geometry.coordinates
  if (!isValidCoordinate(lng, lat)) return null
  return [lng, lat]
}

/** Get latitude from a UnifiedEntity */
export function getEntityLatitude(entity: UnifiedEntity): number | null {
  const coords = getEntityCoordinates(entity)
  return coords ? coords[1] : null
}

/** Get longitude from a UnifiedEntity */
export function getEntityLongitude(entity: UnifiedEntity): number | null {
  const coords = getEntityCoordinates(entity)
  return coords ? coords[0] : null
}
