/**
 * Ground Station <-> Mindex Bi-directional Bridge
 *
 * Syncs ground-station satellite telemetry, observations, and hardware
 * data into mindex, and pulls mindex data back into ground-station context.
 * Also pipelines all data into the agent worldview API.
 */

import type {
  GSSatellitePosition,
  GSSatellite,
  GSScheduledObservation,
  GSMindexSatelliteTelemetry,
  GSMindexObservationRecord,
  GSWorldviewPayload,
} from "./types"

// ============================================================================
// Ground Station -> Mindex (Push)
// ============================================================================

/**
 * Push satellite position telemetry to mindex as time-series data.
 * Each satellite gets its own device_id: gs-sat-{norad_id}
 */
export async function pushPositionsToMindex(
  satellites: GSSatellite[],
  positions: Record<number, GSSatellitePosition>
): Promise<void> {
  const samples: GSMindexSatelliteTelemetry[] = []
  const now = new Date().toISOString()

  for (const sat of satellites) {
    const pos = positions[sat.norad_id]
    if (!pos) continue

    samples.push({
      device_id: `gs-sat-${sat.norad_id}`,
      source: "ground-station",
      norad_id: sat.norad_id,
      satellite_name: sat.name,
      position: { lat: pos.lat, lon: pos.lon, alt: pos.alt },
      velocity: 0,
      azimuth: pos.az,
      elevation: pos.el,
      range: pos.range,
      trend: pos.trend,
      is_visible: pos.is_visible,
      timestamp: now,
    })
  }

  if (samples.length === 0) return

  try {
    await fetch("/api/mindex/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: "ground-station",
        source: "ground-station",
        samples: samples.map((s) => ({
          device_id: s.device_id,
          timestamp: s.timestamp,
          metrics: {
            latitude: s.position.lat,
            longitude: s.position.lon,
            altitude: s.position.alt,
            azimuth: s.azimuth,
            elevation: s.elevation,
            range: s.range,
            trend: s.trend,
            is_visible: s.is_visible ? 1 : 0,
            satellite_name: s.satellite_name,
            norad_id: s.norad_id,
          },
        })),
      }),
    })
  } catch {
    // Non-critical - don't block UI
  }
}

/**
 * Push observation record to mindex when an observation completes.
 */
export async function pushObservationToMindex(
  obs: GSScheduledObservation
): Promise<void> {
  const record: GSMindexObservationRecord = {
    device_id: `gs-obs-${obs.id}`,
    source: "ground-station",
    observation_id: obs.id,
    norad_id: obs.norad_id,
    satellite_name: String(obs.satellite_config?.name || `SAT-${obs.norad_id}`),
    status: obs.status,
    event_start: obs.event_start,
    event_end: obs.event_end,
    peak_elevation: obs.pass_config?.peak_altitude || 0,
    hardware: {
      sdr: obs.sdr_id || undefined,
      rotator: obs.rotator_id || undefined,
      rig: obs.rig_id || undefined,
    },
    sessions: obs.sessions,
    timestamp: new Date().toISOString(),
  }

  try {
    await fetch("/api/mindex/observations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "ground-station",
        observation_type: "satellite_pass",
        ...record,
      }),
    })
  } catch {
    // Non-critical
  }
}

// ============================================================================
// Mindex -> Ground Station (Pull)
// ============================================================================

/**
 * Fetch historical satellite telemetry from mindex for a specific satellite.
 */
export async function pullSatelliteHistoryFromMindex(
  noradId: number,
  hours: number = 24
): Promise<Array<{ timestamp: string; lat: number; lon: number; alt: number }>> {
  try {
    const res = await fetch(
      `/api/mindex/telemetry?mode=latest_samples&device_id=gs-sat-${noradId}&limit=500`
    )
    if (!res.ok) return []
    const data = await res.json()
    const samples = data.data?.samples || data.data || []
    return samples.map((s: Record<string, unknown>) => ({
      timestamp: s.timestamp as string,
      lat: (s.metrics as Record<string, number>)?.latitude || 0,
      lon: (s.metrics as Record<string, number>)?.longitude || 0,
      alt: (s.metrics as Record<string, number>)?.altitude || 0,
    }))
  } catch {
    return []
  }
}

/**
 * Fetch observation records from mindex for display/analysis.
 */
export async function pullObservationsFromMindex(): Promise<
  Array<{
    observation_id: string
    norad_id: number
    satellite_name: string
    status: string
    event_start: string
    event_end: string
  }>
> {
  try {
    const res = await fetch("/api/mindex/observations?source=ground-station&limit=100")
    if (!res.ok) return []
    const data = await res.json()
    return data.data || data.observations || []
  } catch {
    return []
  }
}

// ============================================================================
// Ground Station -> Worldview API (Push)
// ============================================================================

/**
 * Push satellite tracking data to the agent worldview API.
 * This makes ground-station data available to MYCA and all Mycosoft agents.
 */
export async function pushTrackingToWorldview(
  satellites: GSSatellite[],
  positions: Record<number, GSSatellitePosition>,
  trackingNoradId?: number
): Promise<void> {
  const events: GSWorldviewPayload[] = []
  const now = new Date().toISOString()

  // Push individual satellite positions
  for (const sat of satellites) {
    const pos = positions[sat.norad_id]
    if (!pos) continue

    events.push({
      source: "ground-station",
      type: "satellite_tracking",
      data: {
        norad_id: sat.norad_id,
        name: sat.name,
        tle1: sat.tle1,
        tle2: sat.tle2,
        position: { lat: pos.lat, lon: pos.lon, alt: pos.alt },
        azimuth: pos.az,
        elevation: pos.el,
        range: pos.range,
        trend: pos.trend,
        is_visible: pos.is_visible,
        is_tracking: trackingNoradId === sat.norad_id,
      },
      location: { lat: pos.lat, lon: pos.lon, alt: pos.alt },
      timestamp: now,
    })
  }

  if (events.length === 0) return

  try {
    await fetch("/api/agent/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "ground-station",
        batch: true,
        events: events.map((e) => ({
          event_type: e.type,
          data: e.data,
          location: e.location,
          timestamp: e.timestamp,
        })),
      }),
    })
  } catch {
    // Non-critical
  }
}

/**
 * Push observation events to the worldview API.
 */
export async function pushObservationEventToWorldview(
  obs: GSScheduledObservation,
  eventType: "started" | "completed" | "failed"
): Promise<void> {
  try {
    await fetch("/api/agent/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "ground-station",
        event_type: "observation",
        data: {
          observation_id: obs.id,
          norad_id: obs.norad_id,
          satellite_name: obs.satellite_config?.name,
          status: eventType,
          event_start: obs.event_start,
          event_end: obs.event_end,
        },
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // Non-critical
  }
}

/**
 * Push hardware status changes to worldview.
 */
export async function pushHardwareStatusToWorldview(
  hardwareType: "sdr" | "rotator" | "rig",
  hardwareId: string,
  status: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("/api/agent/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "ground-station",
        event_type: "hardware_status",
        data: {
          hardware_type: hardwareType,
          hardware_id: hardwareId,
          ...status,
        },
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // Non-critical
  }
}
