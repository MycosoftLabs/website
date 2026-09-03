import { type NextRequest, NextResponse } from "next/server"
import { PASSIVE_DEVICE_REGISTRY_SOURCES, snapshotFromSourceResults } from "@/lib/fusarium/device-capabilities/registry"
import { requireOwner } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"
const HEADERS = { "Cache-Control": "no-store, max-age=0" } as const

async function readSource(origin: string, sourceRef: string, ownerHeaders: Record<string, string>) {
  const controller = new AbortController()
  // Device Network performs its existing passive registry reconciliation before
  // answering. Keep this bounded, but allow the measured local 12–13 second read.
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(new URL(sourceRef, origin), { cache: "no-store", signal: controller.signal, headers: { Accept: "application/json", ...ownerHeaders } })
    let payload: unknown = null
    try { payload = await response.json() } catch { payload = null }
    const envelope = typeof payload === "object" && payload !== null && !Array.isArray(payload) ? payload as Record<string, unknown> : null
    const rows = Array.isArray(payload) ? payload : envelope && Array.isArray(envelope.devices) ? envelope.devices : []
    if (!response.ok) return { sourceRef, state: response.status === 404 || response.status === 503 ? "unavailable" as const : "error" as const, rows: [], message: `Passive registry returned HTTP ${response.status}.` }
    if (!Array.isArray(payload) && !Array.isArray(envelope?.devices)) return { sourceRef, state: "error" as const, rows: [], message: "Registry response did not contain a devices array." }
    return { sourceRef, state: rows.length ? "available" as const : "empty" as const, rows, message: rows.length ? `${rows.length} registry record(s) received.` : "Registry returned an authoritative empty devices array." }
  } catch {
    return { sourceRef, state: "unavailable" as const, rows: [], message: "Passive registry did not answer within the bounded read window." }
  } finally { clearTimeout(timer) }
}

/** GET-only aggregation. No scan, transport opening, credential, or device action. */
export async function GET(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error
  const ownerHeaders: Record<string, string> = {}
  const cookie = request.headers.get("cookie")
  const authorization = request.headers.get("authorization")
  if (cookie) ownerHeaders.Cookie = cookie
  if (authorization) ownerHeaders.Authorization = authorization
  const results = await Promise.all(PASSIVE_DEVICE_REGISTRY_SOURCES.map((source) => readSource(request.nextUrl.origin, source, ownerHeaders)))
  return NextResponse.json(snapshotFromSourceResults(results, new Date().toISOString()), { status: 200, headers: HEADERS })
}
