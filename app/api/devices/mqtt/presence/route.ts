/**
 * GET /api/devices/mqtt/presence
 *
 * Returns a unified snapshot of every paired MycoBrain by combining:
 *   1. MAS device registry heartbeats (MAS_API_URL/api/devices)
 *   2. Live operator-http probes from /api/mycobrain (devices with `source: operator-http`)
 *
 * In a future revision this becomes a real MQTT subscriber that holds a Mosquitto
 * connection and serves retained `mycosoft/devices/+/presence` topics directly.
 * For now we synthesize the same shape from what the site already polls — same UX,
 * no new infra dependency.
 *
 * Company-gated: requires @mycosoft.org/.com Supabase session.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { isCompanyEmail } from "@/lib/access/types"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"
const SITE_INTERNAL = process.env.WEBSITE_INTERNAL_URL || process.env.NEXT_PUBLIC_SITE_URL || ""

interface PresencePayload {
  device_id: string
  nickname?: string
  host_kind?: string
  host_ip?: string
  agent_url?: string
  agent_version?: string
  side_a_fw?: string
  side_b_fw?: string
  openclaw_available?: boolean
  online: boolean
  last_seen?: string
}

function fromMasDevice(d: Record<string, unknown>): PresencePayload {
  return {
    device_id: String(d.device_id ?? d.id ?? ""),
    nickname: typeof d.device_name === "string" ? d.device_name : undefined,
    host_kind: typeof d.board_type === "string" ? d.board_type : undefined,
    host_ip: typeof d.host === "string" ? d.host : undefined,
    agent_url: typeof d.agent_url === "string" ? d.agent_url : undefined,
    side_a_fw: typeof d.firmware_version === "string" ? d.firmware_version : undefined,
    openclaw_available: Boolean(d.openclaw_url),
    online: d.status === "online",
    last_seen: typeof d.last_seen === "string" ? d.last_seen : undefined,
  }
}

function fromMycobrainDevice(d: Record<string, unknown>): PresencePayload {
  const info = (d.device_info as Record<string, unknown>) || {}
  return {
    device_id: String(d.device_id ?? ""),
    nickname: typeof d.device_name === "string" ? d.device_name : undefined,
    host_kind: typeof info.board_type === "string" ? info.board_type : undefined,
    host_ip: typeof d.network_host === "string" ? d.network_host : undefined,
    agent_url: d.network_host ? `http://${d.network_host}:${d.network_port || 8787}` : undefined,
    side_a_fw: typeof info.firmware_version === "string" ? info.firmware_version : undefined,
    openclaw_available: false, // not surfaced in this shape; UI shows from /openclaw/status
    online: d.connected === true,
    last_seen: typeof info.last_heartbeat === "string" ? info.last_heartbeat : undefined,
  }
}

async function fetchMas(): Promise<PresencePayload[]> {
  try {
    const res = await fetch(`${MAS_API_URL}/api/devices`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.devices || []).map(fromMasDevice)
  } catch { return [] }
}

async function fetchSiteOperators(req: NextRequest): Promise<PresencePayload[]> {
  // Use same-origin to /api/mycobrain — which probes :8787 already.
  const base = SITE_INTERNAL || `${req.nextUrl.protocol}//${req.nextUrl.host}`
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/mycobrain`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = await res.json()
    const ops = (data.devices || []).filter(
      (d: Record<string, unknown>) => d.source === "operator-http"
    )
    return ops.map(fromMycobrainDevice)
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "config_missing" }, { status: 500 })
  }
  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {},
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isCompanyEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const [mas, ops] = await Promise.all([fetchMas(), fetchSiteOperators(req)])
  // Merge: dedupe by device_id, prefer operator-http (live) over MAS (cached)
  const byId = new Map<string, PresencePayload>()
  for (const d of mas) if (d.device_id) byId.set(d.device_id, d)
  for (const d of ops) if (d.device_id) byId.set(d.device_id, d)

  return NextResponse.json({
    devices: Array.from(byId.values()),
    ts: new Date().toISOString(),
    source: mas.length > 0 && ops.length > 0 ? "mas+operator-http" : mas.length > 0 ? "mas" : "operator-http",
  })
}
