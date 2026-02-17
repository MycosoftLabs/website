import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

/**
 * WiFiSense API - Radio-based presence and motion sensing
 *
 * This endpoint aggregates WiFiSense data from MINDEX telemetry pipeline.
 * Returns zone presence status, motion detection, and device health.
 * 
 * GET: Fetch current WiFiSense status (zones, presence, motion)
 * POST: Control WiFiSense features (enable/disable, configure zones)
 */

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")

interface WiFiSenseStatus {
  enabled: boolean
  processing_mode: string
  zones: Array<{
    zone_id: string
    name: string
    devices: string[]
    presence_threshold: number
    motion_sensitivity: number
    enabled: boolean
  }>
  zones_count: number
  devices_count: number
  presence_events: Array<{
    zone_id: string
    state: "present" | "absent" | "entering" | "leaving" | "unknown"
    confidence: number
    last_updated?: string
  }>
  motion_events: Array<{
    zone_id: string
    level: "none" | "low" | "medium" | "high"
    variance: number
    last_updated?: string
  }>
}

/**
 * GET /api/mindex/wifisense
 * 
 * Fetch WiFiSense status from MINDEX.
 * Returns zone configurations, presence events, and motion detection.
 */
export async function GET() {
  try {
    // Fetch WiFiSense status from MINDEX
    const statusRes = await fetch(`${MINDEX_API_URL}/api/mindex/wifisense/status`, {
      headers: {
        "X-API-Key": env.mindexApiKey || "",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    if (!statusRes.ok) {
      // MINDEX endpoint not available - return empty state
      if (statusRes.status === 404) {
        return NextResponse.json<WiFiSenseStatus>({
          enabled: false,
          processing_mode: "phase0",
          zones: [],
          zones_count: 0,
          devices_count: 0,
          presence_events: [],
          motion_events: [],
        })
      }

      console.error(`MINDEX WiFiSense status error: ${statusRes.status}`)
      return NextResponse.json(
        { error: `MINDEX returned ${statusRes.status}` },
        { status: statusRes.status }
      )
    }

    const devices = await statusRes.json()

    // If no devices, return empty state
    if (!devices || devices.length === 0) {
      return NextResponse.json<WiFiSenseStatus>({
        enabled: false,
        processing_mode: "phase0",
        zones: [],
        zones_count: 0,
        devices_count: 0,
        presence_events: [],
        motion_events: [],
      })
    }

    // Fetch recent presence events
    const eventsRes = await fetch(
      `${MINDEX_API_URL}/api/mindex/wifisense/events?limit=50`,
      {
        headers: {
          "X-API-Key": env.mindexApiKey || "",
        },
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      }
    )

    const events = eventsRes.ok ? await eventsRes.json() : []

    // Transform MINDEX data to frontend format
    // Group devices into zones (for now, each device = one zone)
    const zones = devices.map((device: any) => ({
      zone_id: device.device_id,
      name: device.device_name || `Zone ${device.device_id.slice(0, 8)}`,
      devices: [device.device_id],
      presence_threshold: -70, // Default RSSI threshold
      motion_sensitivity: 0.5,
      enabled: true,
    }))

    // Map MINDEX presence events to frontend format
    const presenceEvents = events
      .filter((e: any) => e.presence_type === "occupancy")
      .map((e: any) => ({
        zone_id: e.zone_id,
        state: inferPresenceState(e.confidence),
        confidence: e.confidence,
        last_updated: e.timestamp,
      }))

    const motionEvents = events
      .filter((e: any) => e.presence_type === "motion")
      .map((e: any) => ({
        zone_id: e.zone_id,
        level: inferMotionLevel(e.confidence),
        variance: e.metadata?.variance || 0,
        last_updated: e.timestamp,
      }))

    return NextResponse.json<WiFiSenseStatus>({
      enabled: true,
      processing_mode: "phase0", // RSSI-based detection
      zones,
      zones_count: zones.length,
      devices_count: devices.length,
      presence_events: presenceEvents,
      motion_events: motionEvents,
    })

  } catch (error) {
    console.error("Failed to fetch WiFiSense data:", error)
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    // Return empty state on error (graceful degradation)
    return NextResponse.json<WiFiSenseStatus>(
      {
        enabled: false,
        processing_mode: "phase0",
        zones: [],
        zones_count: 0,
        devices_count: 0,
        presence_events: [],
        motion_events: [],
      },
      { 
        status: 503,
        headers: {
          "X-Error-Message": errorMessage,
        },
      }
    )
  }
}

/**
 * POST /api/mindex/wifisense
 * 
 * Control WiFiSense features.
 * Actions: set_enabled, configure_zone, calibrate_device
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    if (!action) {
      return NextResponse.json(
        { error: "action is required" },
        { status: 400 }
      )
    }

    // Validate action type
    const validActions = ["set_enabled", "configure_zone", "calibrate_device", "reset_zone", "update_threshold"]
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      )
    }

    // Forward control commands to MINDEX WiFiSense control endpoint
    const controlRes = await fetch(`${MINDEX_API_URL}/api/mindex/wifisense/control`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": env.mindexApiKey || "",
      },
      body: JSON.stringify({ action, ...params }),
      signal: AbortSignal.timeout(15000),
    })

    if (!controlRes.ok) {
      // If MINDEX endpoint doesn't exist, return 503 Service Unavailable
      if (controlRes.status === 404) {
        return NextResponse.json({
          error: "WiFiSense control endpoint is not available on MINDEX backend",
          action,
          params,
        }, { status: 503 })
      }

      // For other MINDEX errors, return the upstream status
      const errorBody = await controlRes.text()
      return NextResponse.json(
        { 
          error: `MINDEX control command failed: ${controlRes.status}`,
          details: errorBody,
          action,
        },
        { status: controlRes.status }
      )
    }

    const result = await controlRes.json()
    return NextResponse.json({
      success: true,
      action,
      result,
    })

  } catch (error) {
    console.error("Failed to process WiFiSense command:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { error: `Command failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}

/**
 * Infer presence state from confidence score
 */
function inferPresenceState(confidence: number): "present" | "absent" | "unknown" {
  if (confidence >= 0.7) return "present"
  if (confidence <= 0.3) return "absent"
  return "unknown"
}

/**
 * Infer motion level from confidence score
 */
function inferMotionLevel(confidence: number): "none" | "low" | "medium" | "high" {
  if (confidence >= 0.8) return "high"
  if (confidence >= 0.5) return "medium"
  if (confidence >= 0.2) return "low"
  return "none"
}
