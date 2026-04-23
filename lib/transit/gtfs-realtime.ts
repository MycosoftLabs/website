/**
 * GTFS-Realtime decoder + shared transit utilities — Apr 23, 2026
 *
 * Morgan: "every single ... public transportation public transit for
 * the map". Shared decoder the per-agency connectors import.
 *
 * Uses the canonical `gtfs-realtime-bindings` npm package to decode
 * the protobuf feeds. Normalizes vehicle positions into a single shape
 * that Worldview consumers + CREP map layer can render without knowing
 * which agency the feed came from.
 */

// gtfs-realtime-bindings ships its own .d.ts in recent versions; keep the
// raw default import without @ts-expect-error to survive type-check.
import GtfsRealtimeBindings from "gtfs-realtime-bindings"

export interface TransitVehicle {
  /** Globally-unique id: "<agency>:<vehicle_id_or_trip_id>" */
  id: string
  /** Agency onestop id (o-dr5r-mta, o-dqc-wmata, o-c20-trimet, etc.) */
  agency: string
  agency_name?: string
  route_id?: string
  route_short_name?: string
  trip_id?: string
  vehicle_id?: string
  lat: number
  lng: number
  bearing?: number          // degrees 0-360
  speed_mps?: number        // meters/sec
  timestamp: number         // epoch ms
  occupancy?: string        // EMPTY / MANY_SEATS_AVAILABLE / FEW_SEATS_AVAILABLE / STANDING / FULL
  stop_id?: string
  current_status?: string   // INCOMING_AT / STOPPED_AT / IN_TRANSIT_TO
  vehicle_type?: "bus" | "rail" | "subway" | "ferry" | "tram" | "other"
}

export interface TransitFeedResult {
  ok: boolean
  agency: string
  vehicles: TransitVehicle[]
  generated_at: string
  upstream_count: number
  error?: string
}

/**
 * Fetch + decode a GTFS-realtime VehiclePositions feed. Returns the
 * normalized vehicles array.
 */
export async function fetchVehiclePositions(
  url: string,
  opts: {
    agency: string
    agency_name?: string
    headers?: Record<string, string>
    vehicleType?: TransitVehicle["vehicle_type"]
    timeoutMs?: number
  },
): Promise<TransitFeedResult> {
  const timeoutMs = opts.timeoutMs ?? 10_000
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mycosoft-CREP-Transit/1.0", ...(opts.headers || {}) },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    })
    if (!res.ok) {
      return { ok: false, agency: opts.agency, vehicles: [], generated_at: new Date().toISOString(), upstream_count: 0, error: `upstream ${res.status}` }
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const FeedMessage = (GtfsRealtimeBindings as any).transit_realtime.FeedMessage
    const msg = FeedMessage.decode(buf)
    const entities = msg.entity || []
    const vehicles: TransitVehicle[] = []
    for (const ent of entities) {
      const v = ent.vehicle
      if (!v?.position) continue
      const pos = v.position
      const lat = Number(pos.latitude)
      const lng = Number(pos.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const id = `${opts.agency}:${v.vehicle?.id || v.trip?.tripId || ent.id}`
      const trip = v.trip
      const occupancyEnum = v.occupancyStatus
      const statusEnum = v.currentStatus
      vehicles.push({
        id,
        agency: opts.agency,
        agency_name: opts.agency_name,
        route_id: trip?.routeId,
        trip_id: trip?.tripId,
        vehicle_id: v.vehicle?.id,
        lat,
        lng,
        bearing: typeof pos.bearing === "number" ? pos.bearing : undefined,
        speed_mps: typeof pos.speed === "number" ? pos.speed : undefined,
        timestamp: v.timestamp ? Number(v.timestamp) * 1000 : Date.now(),
        occupancy: occupancyEnum != null ? OCCUPANCY_ENUM[occupancyEnum] : undefined,
        stop_id: v.stopId,
        current_status: statusEnum != null ? STATUS_ENUM[statusEnum] : undefined,
        vehicle_type: opts.vehicleType,
      })
    }
    return {
      ok: true,
      agency: opts.agency,
      vehicles,
      generated_at: new Date().toISOString(),
      upstream_count: entities.length,
    }
  } catch (err: any) {
    return { ok: false, agency: opts.agency, vehicles: [], generated_at: new Date().toISOString(), upstream_count: 0, error: err?.message || "fetch failed" }
  }
}

// GTFS-realtime enum mappings
const OCCUPANCY_ENUM: Record<number, string> = {
  0: "EMPTY", 1: "MANY_SEATS_AVAILABLE", 2: "FEW_SEATS_AVAILABLE",
  3: "STANDING_ROOM_ONLY", 4: "CRUSHED_STANDING_ROOM_ONLY",
  5: "FULL", 6: "NOT_ACCEPTING_PASSENGERS",
}
const STATUS_ENUM: Record<number, string> = {
  0: "INCOMING_AT", 1: "STOPPED_AT", 2: "IN_TRANSIT_TO",
}

/**
 * Concurrency-limited fetch of multiple GTFS-rt feeds.
 * Useful for agencies with one key but many feeds (MTA NYC has 8 subway lines).
 */
export async function fetchMultipleFeeds(
  feeds: Array<{ url: string; vehicleType?: TransitVehicle["vehicle_type"] }>,
  shared: Omit<Parameters<typeof fetchVehiclePositions>[1], "vehicleType">,
): Promise<TransitFeedResult> {
  const results = await Promise.all(
    feeds.map((f) => fetchVehiclePositions(f.url, { ...shared, vehicleType: f.vehicleType })),
  )
  const allVehicles: TransitVehicle[] = []
  const errors: string[] = []
  let upstream = 0
  for (const r of results) {
    allVehicles.push(...r.vehicles)
    upstream += r.upstream_count
    if (!r.ok && r.error) errors.push(r.error)
  }
  return {
    ok: errors.length < feeds.length, // ok if ANY feed succeeded
    agency: shared.agency,
    vehicles: allVehicles,
    generated_at: new Date().toISOString(),
    upstream_count: upstream,
    error: errors.length ? errors.join("; ") : undefined,
  }
}

/** Viewport cull for transit vehicles — drops anything outside bbox. */
export function cullVehiclesToBbox(
  vehicles: TransitVehicle[],
  bbox: [number, number, number, number] | null,
): TransitVehicle[] {
  if (!bbox) return vehicles
  const [w, s, e, n] = bbox
  return vehicles.filter((v) => v.lng >= w && v.lng <= e && v.lat >= s && v.lat <= n)
}
