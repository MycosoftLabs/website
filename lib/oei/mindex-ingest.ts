/**
 * MINDEX Ingestion Helper for CREP Data
 * 
 * Non-blocking ingestion of CREP data into MINDEX for persistent storage
 * and historical playback. Failures are logged but don't affect the main response.
 */

type IngestType = 
  | "aircraft" 
  | "vessels" 
  | "satellites" 
  | "events" 
  | "weather" 
  | "telemetry"
  | "lightning"
  | "fires"
  | "smoke"
  | "spores"
  | "debris"

interface IngestOptions {
  type: IngestType
  source: string
  data: Record<string, unknown>[] | Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Non-blocking ingestion of data to MINDEX
 * Fires and forgets - errors are logged but don't block the main request
 */
export function ingestToMINDEX(options: IngestOptions): void {
  const { type, source, data, metadata } = options
  
  // Don't ingest empty data
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return
  }
  
  // Fire and forget - don't await
  const baseUrl = typeof window !== "undefined" 
    ? "" 
    : (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3010")
  
  fetch(`${baseUrl}/api/mindex/ingest/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    }),
  }).catch(error => {
    // Log but don't throw - ingestion failures shouldn't affect the main request
    console.warn(`[MINDEX Ingest] Failed to ingest ${type} from ${source}:`, error)
  })
}

/**
 * Batch ingest with deduplication support
 * Uses IDs to prevent duplicate entries
 */
export function ingestBatchToMINDEX(
  type: IngestType,
  source: string,
  items: Array<{ id: string } & Record<string, unknown>>,
  metadata?: Record<string, unknown>
): void {
  if (!items || items.length === 0) return
  
  ingestToMINDEX({
    type,
    source,
    data: items,
    metadata: {
      ...metadata,
      batch_size: items.length,
      dedupe_key: "id",
    },
  })
}

/**
 * Ingest aircraft data with track history
 */
export function ingestAircraft(
  source: string,
  aircraft: Array<{
    icao24?: string
    callsign?: string
    latitude?: number
    longitude?: number
    altitude?: number
    velocity?: number
    heading?: number
    on_ground?: boolean
    [key: string]: unknown
  }>
): void {
  if (!aircraft || aircraft.length === 0) return
  
  const items = aircraft.map((a, i) => ({
    id: a.icao24 || `aircraft-${Date.now()}-${i}`,
    ...a,
    entity_type: "aircraft",
    captured_at: new Date().toISOString(),
  }))
  
  ingestBatchToMINDEX("aircraft", source, items, {
    entity_count: aircraft.length,
    has_position: aircraft.filter(a => a.latitude && a.longitude).length,
  })
}

/**
 * Ingest vessel data with track history
 */
export function ingestVessels(
  source: string,
  vessels: Array<{
    mmsi?: string
    name?: string
    latitude?: number
    longitude?: number
    speed?: number
    course?: number
    type?: string
    [key: string]: unknown
  }>
): void {
  if (!vessels || vessels.length === 0) return
  
  const items = vessels.map((v, i) => ({
    id: v.mmsi || `vessel-${Date.now()}-${i}`,
    ...v,
    entity_type: "vessel",
    captured_at: new Date().toISOString(),
  }))
  
  ingestBatchToMINDEX("vessels", source, items, {
    entity_count: vessels.length,
    has_position: vessels.filter(v => v.latitude && v.longitude).length,
  })
}

/**
 * Ingest satellite data with orbital elements
 */
export function ingestSatellites(
  source: string,
  satellites: Array<{
    noradId?: number
    name?: string
    latitude?: number
    longitude?: number
    altitude?: number
    velocity?: number
    [key: string]: unknown
  }>
): void {
  if (!satellites || satellites.length === 0) return
  
  const items = satellites.map((s, i) => ({
    id: s.noradId?.toString() || `sat-${Date.now()}-${i}`,
    ...s,
    entity_type: "satellite",
    captured_at: new Date().toISOString(),
  }))
  
  ingestBatchToMINDEX("satellites", source, items, {
    entity_count: satellites.length,
  })
}

/**
 * Ingest global events (earthquakes, volcanoes, storms, etc.)
 */
export function ingestEvents(
  source: string,
  events: Array<{
    id: string
    type: string
    title?: string
    severity?: string
    latitude?: number
    longitude?: number
    timestamp?: string
    [key: string]: unknown
  }>
): void {
  if (!events || events.length === 0) return
  
  const items = events.map(e => ({
    ...e,
    entity_type: "event",
    captured_at: new Date().toISOString(),
  }))
  
  ingestBatchToMINDEX("events", source, items, {
    event_count: events.length,
    event_types: [...new Set(events.map(e => e.type))],
  })
}

/**
 * Ingest lightning strike data
 */
export function ingestLightning(
  source: string,
  strikes: Array<{
    id: string
    lat: number
    lon: number
    time: number
    intensity?: number
    polarity?: number
    stations?: number
    [key: string]: unknown
  }>
): void {
  if (!strikes || strikes.length === 0) return
  
  const items = strikes.map(s => ({
    ...s,
    entity_type: "lightning",
    captured_at: new Date().toISOString(),
    timestamp: new Date(s.time / 1000000).toISOString(), // Convert nanoseconds to ISO
  }))
  
  ingestBatchToMINDEX("lightning", source, items, {
    strike_count: strikes.length,
    time_range: {
      start: Math.min(...strikes.map(s => s.time)),
      end: Math.max(...strikes.map(s => s.time)),
    },
  })
}

/**
 * Ingest fire/wildfire data
 */
export function ingestFires(
  source: string,
  fires: Array<{
    id: string
    lat: number
    lon: number
    frp?: number // Fire Radiative Power
    confidence?: number
    acresBurning?: number
    containment?: number
    name?: string
    [key: string]: unknown
  }>
): void {
  if (!fires || fires.length === 0) return
  
  const items = fires.map(f => ({
    ...f,
    entity_type: "fire",
    captured_at: new Date().toISOString(),
  }))
  
  ingestBatchToMINDEX("fires", source, items, {
    fire_count: fires.length,
    total_frp: fires.reduce((sum, f) => sum + (f.frp || 0), 0),
  })
}

/**
 * Ingest smoke dispersion data
 */
export function ingestSmoke(
  source: string,
  smokePlumes: Array<{
    id: string
    sourceFireId?: string
    lat: number
    lon: number
    intensity: number
    direction: number
    length: number
    [key: string]: unknown
  }>
): void {
  if (!smokePlumes || smokePlumes.length === 0) return
  
  const items = smokePlumes.map(s => ({
    ...s,
    entity_type: "smoke",
    captured_at: new Date().toISOString(),
  }))
  
  ingestBatchToMINDEX("smoke", source, items, {
    plume_count: smokePlumes.length,
  })
}

/**
 * Ingest spore dispersal data
 */
export function ingestSpores(
  source: string,
  sporeZones: Array<{
    id: string
    lat: number
    lon: number
    radius: number
    concentration: number
    riskLevel: string
    species: string
    [key: string]: unknown
  }>
): void {
  if (!sporeZones || sporeZones.length === 0) return
  
  const items = sporeZones.map(s => ({
    ...s,
    entity_type: "spore_zone",
    captured_at: new Date().toISOString(),
  }))
  
  ingestBatchToMINDEX("spores", source, items, {
    zone_count: sporeZones.length,
    risk_levels: [...new Set(sporeZones.map(s => s.riskLevel))],
  })
}

/**
 * Ingest space debris data
 */
export function ingestDebris(
  source: string,
  debris: Array<{
    id: string
    name?: string
    noradId?: number
    latitude: number
    longitude: number
    altitude: number
    velocity?: number
    size?: string
    riskLevel?: string
    [key: string]: unknown
  }>
): void {
  if (!debris || debris.length === 0) return
  
  const items = debris.map((d, i) => ({
    id: d.noradId?.toString() || d.id || `debris-${Date.now()}-${i}`,
    ...d,
    entity_type: "debris",
    captured_at: new Date().toISOString(),
  }))
  
  ingestBatchToMINDEX("debris", source, items, {
    debris_count: debris.length,
    by_size: debris.reduce((acc, d) => {
      const size = d.size || "unknown"
      acc[size] = (acc[size] || 0) + 1
      return acc
    }, {} as Record<string, number>),
  })
}

/**
 * Ingest weather grid data (for Earth-2 integration)
 */
export function ingestWeatherGrid(
  source: string,
  weatherData: {
    variable: string
    forecastHours: number
    bounds: { north: number; south: number; east: number; west: number }
    gridSize: { rows: number; cols: number }
    min: number
    max: number
    mean?: number
    timestamp: string
  }
): void {
  ingestToMINDEX({
    type: "weather",
    source,
    data: {
      id: `weather-${weatherData.variable}-${weatherData.timestamp}`,
      ...weatherData,
      entity_type: "weather_grid",
      captured_at: new Date().toISOString(),
    },
    metadata: {
      variable: weatherData.variable,
      forecast_hours: weatherData.forecastHours,
    },
  })
}

/**
 * Ingest device telemetry data
 */
export function ingestDeviceTelemetry(
  source: string,
  deviceId: string,
  telemetry: {
    temperature?: number
    humidity?: number
    pressure?: number
    light?: number
    moisture?: number
    [key: string]: number | string | boolean | undefined
  }
): void {
  ingestToMINDEX({
    type: "telemetry",
    source,
    data: {
      id: `telemetry-${deviceId}-${Date.now()}`,
      device_id: deviceId,
      ...telemetry,
      entity_type: "device_telemetry",
      captured_at: new Date().toISOString(),
    },
    metadata: {
      device_id: deviceId,
      metrics: Object.keys(telemetry).filter(k => telemetry[k] !== undefined),
    },
  })
}
