import { NextRequest, NextResponse } from "next/server"

/**
 * Shinobi connector — pulls monitor list from MAS 188 Shinobi instance —
 * Apr 20, 2026 (Eagle Eye Phase 2)
 *
 * Shinobi exposes /{API_KEY}/monitor/{GROUP_KEY} returning monitor JSON
 * with: mid, name, details (stringified JSON), streams[], snapshot,
 * host, port, type, mode, shinobi_id, etc. We map each to an
 * eagle.video_sources row with kind='permanent', provider='shinobi',
 * stable_location=true, and best-effort lat/lng from details.crep_lat /
 * details.crep_lng if the operator set them in the Shinobi UI Monitor
 * Map tab.
 *
 * Routes:
 *   GET  /api/eagle/connectors/shinobi          → live list (with bbox filter)
 *   POST /api/eagle/connectors/shinobi/sync     → POST to MINDEX ingest (Eagle Eye Phase 2)
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SHINOBI_URL = process.env.SHINOBI_URL || "http://192.168.0.188:8080"
const SHINOBI_API_KEY = process.env.SHINOBI_API_KEY
const SHINOBI_GROUP_KEY = process.env.SHINOBI_GROUP_KEY

const MINDEX_BASE =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_API_URL ||
  "http://192.168.0.189:8000"

const MINDEX_INTERNAL_TOKEN =
  process.env.MINDEX_INTERNAL_TOKEN ||
  (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0].trim() ||
  ""

function authHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY }
  return {}
}

type ShinobiMonitor = {
  mid?: string
  id?: string
  name?: string
  details?: string | Record<string, any>
  streams?: string[]
  snapshot?: string
  host?: string
  port?: number
  mode?: string
  type?: string
}

function parseMonitor(m: ShinobiMonitor) {
  let details: Record<string, any> = {}
  try {
    details = typeof m.details === "string" ? JSON.parse(m.details) : m.details || {}
  } catch { /* ignore */ }
  const lat = Number(details.crep_lat ?? details.lat ?? (m as any).lat)
  const lng = Number(details.crep_lng ?? details.lng ?? (m as any).lng)
  const id = String(m.mid || m.id || "")
  const firstStream = Array.isArray(m.streams) && m.streams.length ? m.streams[0] : null
  const streamUrl = firstStream ? `${SHINOBI_URL}${firstStream}` : m.snapshot || null
  return {
    id: `shinobi-${id}`,
    kind: "permanent" as const,
    provider: "shinobi",
    stable_location: Number.isFinite(lat) && Number.isFinite(lng),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    location_confidence: Number.isFinite(lat) && Number.isFinite(lng) ? 1.0 : null,
    stream_url: streamUrl,
    embed_url: null,
    media_url: m.snapshot || null,
    source_status: m.mode === "start" ? "online" : "offline",
    permissions: { access: "shinobi-managed", tier: "first-party" },
    retention_policy: { ttl_days: 30 },
    name: m.name || null,
    raw: { mid: id, host: m.host, port: m.port, type: m.type, mode: m.mode, details },
  }
}

async function pullShinobi(): Promise<any[]> {
  if (!SHINOBI_API_KEY || !SHINOBI_GROUP_KEY) return []
  try {
    const res = await fetch(`${SHINOBI_URL}/${SHINOBI_API_KEY}/monitor/${SHINOBI_GROUP_KEY}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: ShinobiMonitor[] = Array.isArray(j) ? j : j?.monitors || []
    return items.map(parseMonitor)
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const monitors = await pullShinobi()
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  let filtered = monitors
  if (bbox) {
    const [w, s, e, n] = bbox.split(",").map(Number)
    if ([w, s, e, n].every(Number.isFinite)) {
      filtered = monitors.filter(
        (m) => m.lat != null && m.lng != null && m.lat >= s && m.lat <= n && m.lng >= w && m.lng <= e,
      )
    }
  }
  return NextResponse.json(
    {
      source: "shinobi-mas",
      total: filtered.length,
      unlocated: monitors.filter((m) => !m.stable_location).length,
      monitors: filtered,
      note: !SHINOBI_API_KEY
        ? "SHINOBI_API_KEY + SHINOBI_GROUP_KEY env vars not set on prod — connector inactive."
        : undefined,
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180" } },
  )
}

// Sync to MINDEX (called by cron or on-demand).
export async function POST(req: NextRequest) {
  const monitors = await pullShinobi()
  const ingestable = monitors.filter((m) => m.stable_location)
  if (ingestable.length === 0) {
    return NextResponse.json({ synced: 0, note: "no geo-located monitors to sync" })
  }
  try {
    const res = await fetch(`${MINDEX_BASE}/api/mindex/ingest/eagle_video_sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
      body: JSON.stringify({
        entities: ingestable.map((m) => ({
          source: "shinobi",
          source_id: m.id,
          name: m.name,
          entity_type: "video_source",
          lat: m.lat,
          lng: m.lng,
          properties: {
            kind: m.kind,
            provider: m.provider,
            stable_location: m.stable_location,
            location_confidence: m.location_confidence,
            stream_url: m.stream_url,
            media_url: m.media_url,
            source_status: m.source_status,
            permissions: m.permissions,
            retention_policy: m.retention_policy,
            ...m.raw,
          },
        })),
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      return NextResponse.json({ synced: 0, error: `MINDEX ${res.status}: ${txt.slice(0, 200)}` }, { status: 502 })
    }
    return NextResponse.json({ synced: ingestable.length, total_monitors: monitors.length })
  } catch (err: any) {
    return NextResponse.json({ synced: 0, error: err?.message || "sync failed" }, { status: 500 })
  }
}
