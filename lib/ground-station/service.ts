/**
 * Ground Station Service Layer
 *
 * Client-side service for communicating with the ground-station backend
 * through our Next.js API proxy routes. Handles all satellite tracking,
 * hardware control, observation scheduling, and data sync.
 */

import type {
  GSSatellite,
  GSTransmitter,
  GSRig,
  GSSDR,
  GSRotator,
  GSLocation,
  GSGroup,
  GSCamera,
  GSTrackingState,
  GSPreference,
  GSTLESource,
  GSMonitoredSatellite,
  GSScheduledObservation,
  GSSatellitePass,
  GSSatellitePosition,
  GSWaterfallState,
  GSVFOState,
  GSSystemInfo,
  GSConnectionConfig,
  GSMindexSatelliteTelemetry,
  GSMindexObservationRecord,
  GSWorldviewPayload,
} from "./types"

const API_BASE = "/api/ground-station"

async function gsApiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error")
    throw new Error(`Ground Station API error (${res.status}): ${err}`)
  }
  return res.json()
}

// ============================================================================
// Satellites
// ============================================================================

export async function fetchSatellites(groupId?: string): Promise<GSSatellite[]> {
  const params = groupId ? `?group_id=${groupId}` : ""
  return gsApiFetch<GSSatellite[]>(`/satellites${params}`)
}

export async function fetchSatelliteById(noradId: number): Promise<GSSatellite> {
  return gsApiFetch<GSSatellite>(`/satellites?norad_id=${noradId}`)
}

export async function fetchTransmitters(noradId: number): Promise<GSTransmitter[]> {
  return gsApiFetch<GSTransmitter[]>(`/satellites?action=transmitters&norad_id=${noradId}`)
}

export async function fetchSatellitePasses(
  groupId: string,
  hours: number = 24
): Promise<GSSatellitePass[]> {
  return gsApiFetch<GSSatellitePass[]>(`/satellites?action=passes&group_id=${groupId}&hours=${hours}`)
}

// ============================================================================
// Groups
// ============================================================================

export async function fetchGroups(): Promise<GSGroup[]> {
  return gsApiFetch<GSGroup[]>("/groups")
}

export async function createGroup(group: Partial<GSGroup>): Promise<GSGroup> {
  return gsApiFetch<GSGroup>("/groups", {
    method: "POST",
    body: JSON.stringify(group),
  })
}

export async function updateGroup(id: string, data: Partial<GSGroup>): Promise<GSGroup> {
  return gsApiFetch<GSGroup>("/groups", {
    method: "PUT",
    body: JSON.stringify({ id, ...data }),
  })
}

// ============================================================================
// Tracking
// ============================================================================

export async function fetchTrackingState(): Promise<GSTrackingState> {
  return gsApiFetch<GSTrackingState>("/tracking")
}

export async function setTrackingState(state: Partial<GSTrackingState>): Promise<GSTrackingState> {
  return gsApiFetch<GSTrackingState>("/tracking", {
    method: "POST",
    body: JSON.stringify(state),
  })
}

// ============================================================================
// Hardware
// ============================================================================

export async function fetchSDRs(): Promise<GSSDR[]> {
  return gsApiFetch<GSSDR[]>("/hardware?type=sdrs")
}

export async function fetchRotators(): Promise<GSRotator[]> {
  return gsApiFetch<GSRotator[]>("/hardware?type=rotators")
}

export async function fetchRigs(): Promise<GSRig[]> {
  return gsApiFetch<GSRig[]>("/hardware?type=rigs")
}

export async function fetchCameras(): Promise<GSCamera[]> {
  return gsApiFetch<GSCamera[]>("/hardware?type=cameras")
}

// ============================================================================
// Scheduler / Observations
// ============================================================================

export async function fetchScheduledObservations(): Promise<GSScheduledObservation[]> {
  return gsApiFetch<GSScheduledObservation[]>("/observations")
}

export async function fetchMonitoredSatellites(): Promise<GSMonitoredSatellite[]> {
  return gsApiFetch<GSMonitoredSatellite[]>("/scheduler")
}

export async function createObservation(
  obs: Partial<GSScheduledObservation>
): Promise<GSScheduledObservation> {
  return gsApiFetch<GSScheduledObservation>("/observations", {
    method: "POST",
    body: JSON.stringify(obs),
  })
}

export async function cancelObservation(id: string): Promise<void> {
  await gsApiFetch(`/observations?id=${id}&action=cancel`, { method: "POST" })
}

// ============================================================================
// Locations
// ============================================================================

export async function fetchLocations(): Promise<GSLocation[]> {
  return gsApiFetch<GSLocation[]>("/locations")
}

export async function setActiveLocation(id: string): Promise<void> {
  await gsApiFetch("/locations", {
    method: "POST",
    body: JSON.stringify({ id, action: "activate" }),
  })
}

// ============================================================================
// System
// ============================================================================

export async function fetchSystemInfo(): Promise<GSSystemInfo> {
  return gsApiFetch<GSSystemInfo>("/system")
}

export async function fetchPreferences(): Promise<GSPreference[]> {
  return gsApiFetch<GSPreference[]>("/preferences")
}

export async function updatePreference(name: string, value: string): Promise<void> {
  await gsApiFetch("/preferences", {
    method: "POST",
    body: JSON.stringify({ name, value }),
  })
}

export async function fetchTLESources(): Promise<GSTLESource[]> {
  return gsApiFetch<GSTLESource[]>("/system?action=tle_sources")
}

export async function syncTLEs(): Promise<{ updated: number; added: number }> {
  return gsApiFetch("/system?action=sync_tles", { method: "POST" })
}

// ============================================================================
// Waterfall / SDR Control
// ============================================================================

export async function fetchWaterfallState(): Promise<GSWaterfallState> {
  return gsApiFetch<GSWaterfallState>("/waterfall")
}

export async function startWaterfall(sdrId: string, config: Partial<GSWaterfallState>): Promise<void> {
  await gsApiFetch("/waterfall", {
    method: "POST",
    body: JSON.stringify({ action: "start", sdr_id: sdrId, ...config }),
  })
}

export async function stopWaterfall(): Promise<void> {
  await gsApiFetch("/waterfall", {
    method: "POST",
    body: JSON.stringify({ action: "stop" }),
  })
}

// ============================================================================
// Mindex Integration
// ============================================================================

export async function pushSatelliteTelemetryToMindex(
  telemetry: GSMindexSatelliteTelemetry[]
): Promise<void> {
  await fetch("/api/mindex/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_id: "ground-station",
      source: "ground-station",
      samples: telemetry.map((t) => ({
        device_id: `gs-sat-${t.norad_id}`,
        timestamp: t.timestamp,
        metrics: {
          latitude: t.position.lat,
          longitude: t.position.lon,
          altitude: t.position.alt,
          velocity: t.velocity,
          azimuth: t.azimuth,
          elevation: t.elevation,
          range: t.range,
          trend: t.trend,
          is_visible: t.is_visible ? 1 : 0,
          satellite_name: t.satellite_name,
          norad_id: t.norad_id,
        },
      })),
    }),
  })
}

export async function pushObservationToMindex(record: GSMindexObservationRecord): Promise<void> {
  await fetch("/api/mindex/observations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "ground-station",
      observation_type: "satellite_pass",
      ...record,
    }),
  })
}

export async function fetchMindexSatelliteHistory(
  noradId: number,
  hours: number = 24
): Promise<GSMindexSatelliteTelemetry[]> {
  const res = await fetch(
    `/api/mindex/telemetry?mode=latest_samples&device_id=gs-sat-${noradId}&hours=${hours}`
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.data?.samples || []
}

// ============================================================================
// Worldview API Integration
// ============================================================================

export async function pushToWorldview(payload: GSWorldviewPayload): Promise<void> {
  await fetch("/api/agent/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "ground-station",
      event_type: payload.type,
      data: payload.data,
      location: payload.location,
      timestamp: payload.timestamp,
    }),
  })
}

export async function pushBatchToWorldview(payloads: GSWorldviewPayload[]): Promise<void> {
  await fetch("/api/agent/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "ground-station",
      batch: true,
      events: payloads.map((p) => ({
        event_type: p.type,
        data: p.data,
        location: p.location,
        timestamp: p.timestamp,
      })),
    }),
  })
}
