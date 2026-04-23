import { NextRequest, NextResponse } from "next/server"
import { verifyWaypoint, type Waypoint } from "@/lib/myca/waypoint-verifier"
import { publishEntity } from "@/lib/myca/entity-feed-bus"

/**
 * MYCA Waypoint Verify — Apr 22, 2026
 *
 * POST /api/myca/waypoint-verify
 *
 * Body:  { waypoint: { id, lat, lng, name, notes, category, ... } }
 *
 * Flow:
 *   1. Call verifyWaypoint() — parallel probes of OSM / Nominatim /
 *      MINDEX / known-bases. Returns confidence + classified type.
 *   2. If status === "auto_add" AND confidence ≥ 0.85:
 *        - POST entity to MINDEX ingestion endpoint
 *        - publish SSE event on /api/myca/entity-feed so CREP clients
 *          add the marker live
 *   3. If "review" or "user_tag_only": skip MINDEX + SSE but still
 *      return the classification so the waypoint panel can display it.
 *
 * Morgan: "a new navy base marker and perimeter should be added to it
 * live almost instantly after confirmed automatically that is a backend
 * agent automation etl system needed to be functional globally".
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MINDEX_BASE =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_API_URL ||
  "http://192.168.0.189:8000"

function mindexHeaders(): Record<string, string> {
  const t = process.env.MINDEX_INTERNAL_TOKEN ||
    (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0]?.trim() || ""
  if (t) return { "X-Internal-Token": t, "Content-Type": "application/json" }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY, "Content-Type": "application/json" }
  return { "Content-Type": "application/json" }
}

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }) }

  const wp = body?.waypoint as Waypoint | undefined
  if (!wp || !Number.isFinite(wp.lat) || !Number.isFinite(wp.lng) || !wp.id) {
    return NextResponse.json({ error: "waypoint { id, lat, lng } required" }, { status: 400 })
  }

  // Run the verifier. This fans out to OSM + Nominatim + MINDEX + known
  // bases in parallel so the whole thing lands in ~1–3 seconds.
  const result = await verifyWaypoint(wp)

  // If confidence is high enough, persist to MINDEX + broadcast to
  // connected CREP clients via SSE.
  let mindex_write: any = null
  if (result.status === "auto_add" && result.classified_type) {
    const entity = {
      source: "myca-waypoint-verify",
      entity_type: result.classified_type,
      entity_subtype: result.classified_subtype,
      name: result.display_name,
      lat: result.lat,
      lng: result.lng,
      perimeter: result.perimeter,
      confidence: result.confidence,
      verified_from: {
        waypoint_id: wp.id,
        user_name: wp.name,
        user_notes: wp.notes,
        category: wp.category,
      },
      citations: result.citations,
      collected_at: new Date().toISOString(),
    }
    // Best-effort — don't fail the verify if MINDEX is unreachable
    try {
      const res = await fetch(`${MINDEX_BASE}/api/v1/ingest/myca-verified-entity`, {
        method: "POST",
        headers: mindexHeaders(),
        body: JSON.stringify(entity),
        signal: AbortSignal.timeout(6_000),
      })
      mindex_write = {
        status: res.status,
        ok: res.ok,
      }
    } catch (err: any) {
      mindex_write = { status: 0, ok: false, error: err?.message || "mindex unreachable" }
    }

    // SSE broadcast: connected CREP dashboards get the new entity
    // live via /api/myca/entity-feed. This is the "almost instantly
    // after confirmed" behavior Morgan asked for.
    publishEntity(entity)
  }

  return NextResponse.json({
    ...result,
    mindex_write,
  })
}
