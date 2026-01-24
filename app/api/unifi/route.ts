/**
 * UniFi Network API (real-only)
 *
 * This route proxies the UniFi Network API on the UDM to the website.
 * No mock/demo responses are allowed. If not configured, returns 503.
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// UniFi uses self-signed certs by default
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const UNIFI_HOST = process.env.UNIFI_HOST || "192.168.0.1"
const UNIFI_API_KEY = process.env.UNIFI_API_KEY
const UNIFI_SITE = process.env.UNIFI_SITE || "default"

interface UniFiApiResponse<T> {
  meta: { rc: string; msg?: string }
  data: T[]
}

function requireUnifiKey() {
  if (!UNIFI_API_KEY) {
    return NextResponse.json(
      { error: "UNIFI_API_KEY is not configured", code: "CONFIG_MISSING", requiredEnv: ["UNIFI_API_KEY"] },
      { status: 503 },
    )
  }
  return null
}

async function unifiGet<T>(endpoint: string): Promise<T[]> {
  if (!UNIFI_API_KEY) throw new Error("UNIFI_API_KEY is not configured")
  const url = `https://${UNIFI_HOST}/proxy/network/api/s/${UNIFI_SITE}${endpoint}`
  const response = await fetch(url, {
    headers: { "X-API-Key": UNIFI_API_KEY, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`UniFi API error: ${response.status} for ${endpoint}`)
  const payload = (await response.json()) as UniFiApiResponse<T>
  return payload.data || []
}

async function unifiPost<T>(endpoint: string, body: unknown): Promise<T[]> {
  if (!UNIFI_API_KEY) throw new Error("UNIFI_API_KEY is not configured")
  const url = `https://${UNIFI_HOST}/proxy/network/api/s/${UNIFI_SITE}${endpoint}`
  const response = await fetch(url, {
    method: "POST",
    headers: { "X-API-Key": UNIFI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`UniFi API POST error: ${response.status} for ${endpoint}`)
  const payload = (await response.json()) as UniFiApiResponse<T>
  return payload.data || []
}

export async function GET(request: NextRequest) {
  const missing = requireUnifiKey()
  if (missing) return missing

  const action = request.nextUrl.searchParams.get("action") || "dashboard"
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "50")

  try {
    switch (action) {
      case "dashboard": {
        const [health, devices, clients, alarms] = await Promise.all([
          unifiGet<any>("/stat/health"),
          unifiGet<any>("/stat/device"),
          unifiGet<any>("/stat/sta"),
          unifiGet<any>("/stat/alarm").catch(() => []),
        ])
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          health,
          devices,
          clients,
          alarms,
        })
      }
      case "health":
        return NextResponse.json({ data: await unifiGet<any>("/stat/health"), timestamp: new Date().toISOString() })
      case "devices":
        return NextResponse.json({ data: await unifiGet<any>("/stat/device"), timestamp: new Date().toISOString() })
      case "clients":
        return NextResponse.json({ data: await unifiGet<any>("/stat/sta"), timestamp: new Date().toISOString() })
      case "alarms":
        return NextResponse.json({ data: (await unifiGet<any>("/stat/alarm")).slice(0, limit), timestamp: new Date().toISOString() })
      case "events":
        return NextResponse.json({ data: (await unifiGet<any>("/stat/event")).slice(0, limit), timestamp: new Date().toISOString() })
      case "dpi":
        return NextResponse.json({ data: await unifiGet<any>("/stat/dpi"), timestamp: new Date().toISOString() })
      case "wifi":
      case "wlans":
        return NextResponse.json({ data: await unifiGet<any>("/rest/wlanconf"), timestamp: new Date().toISOString() })
      case "topology": {
        const [devices, clients] = await Promise.all([unifiGet<any>("/stat/device"), unifiGet<any>("/stat/sta")])
        return NextResponse.json({ devices, clients, timestamp: new Date().toISOString() })
      }
      case "traffic":
        return NextResponse.json({ data: await unifiGet<any>("/stat/traffic"), timestamp: new Date().toISOString() })
      default:
        return NextResponse.json({ error: "Unknown action", code: "VALIDATION_ERROR" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch UniFi data", code: "UNIFI_ERROR", details: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    )
  }
}

export async function POST(request: NextRequest) {
  const missing = requireUnifiKey()
  if (missing) return missing

  const body = (await request.json()) as { action?: string; mac?: string; device_mac?: string }
  const action = body.action

  try {
    switch (action) {
      case "block-client":
        if (!body.mac) return NextResponse.json({ error: "MAC address required", code: "VALIDATION_ERROR" }, { status: 400 })
        await unifiPost("/cmd/stamgr", { cmd: "block-sta", mac: body.mac })
        return NextResponse.json({ ok: true, action, mac: body.mac })
      case "unblock-client":
        if (!body.mac) return NextResponse.json({ error: "MAC address required", code: "VALIDATION_ERROR" }, { status: 400 })
        await unifiPost("/cmd/stamgr", { cmd: "unblock-sta", mac: body.mac })
        return NextResponse.json({ ok: true, action, mac: body.mac })
      case "kick-client":
        if (!body.mac) return NextResponse.json({ error: "MAC address required", code: "VALIDATION_ERROR" }, { status: 400 })
        await unifiPost("/cmd/stamgr", { cmd: "kick-sta", mac: body.mac })
        return NextResponse.json({ ok: true, action, mac: body.mac })
      case "restart-device":
        if (!body.device_mac) return NextResponse.json({ error: "device_mac required", code: "VALIDATION_ERROR" }, { status: 400 })
        await unifiPost("/cmd/devmgr", { cmd: "restart", mac: body.device_mac })
        return NextResponse.json({ ok: true, action, device_mac: body.device_mac })
      default:
        return NextResponse.json({ error: "Unknown action", code: "VALIDATION_ERROR" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to execute UniFi action", code: "UNIFI_ERROR", details: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    )
  }
}

