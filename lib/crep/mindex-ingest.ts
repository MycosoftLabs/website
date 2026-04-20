/**
 * MINDEX ingest helper — Apr 20, 2026
 *
 * After Cursor shipped MINDEX commit 402de15 to VM 189 (schema `crep.*` +
 * ingest routes `/api/mindex/ingest/{layer}` + telemetry auth fix), the
 * website can warm the MINDEX cache by fire-and-forget POSTing each fetch
 * result. Reusable helper so aircraft / vessel / rail / cctv / future
 * registries don't duplicate the auth + dispatch plumbing.
 *
 * Contract:
 *   ingestToMindex({
 *     layer: "aircraft_live",
 *     entities: [{ source, source_id, name, entity_type, lat, lng,
 *                  occurred_at, properties }, …]
 *   })
 *
 * Behaviour:
 *   - No-op if neither MINDEX_INTERNAL_TOKEN nor MINDEX_API_KEY is set
 *     (local dev). No exception — logs once per call.
 *   - Prefers X-Internal-Token (the auth path Cursor wired for /ingest).
 *     Falls back to X-API-Key for legacy routes.
 *   - 20 s timeout + swallow errors (cache warming must never block the
 *     primary fetch). Writes a console.warn on non-2xx.
 *   - Chunks entities into batches of 500 so a 30 k aircraft harvest
 *     doesn't ship a single 30 MB body to MINDEX.
 *
 * Rail registry already uses an inline version of this helper
 * (lib/crep/registries/rail-registry.ts). New registries should use this
 * module instead.
 */

const MINDEX_BASE =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_API_URL ||
  "http://192.168.0.189:8000"

// Apr 20, 2026 (Cursor verified on VM 189): MINDEX accepts a comma-
// separated list env var `MINDEX_INTERNAL_TOKENS` (plural). Older docs +
// my earlier code used the singular `MINDEX_INTERNAL_TOKEN`. Read BOTH
// so the client is robust regardless of which name prod has set. If the
// plural form has multiple tokens, use the first one.
const MINDEX_INTERNAL_TOKEN =
  process.env.MINDEX_INTERNAL_TOKEN ||
  (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0].trim() ||
  ""
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || ""

export interface MindexEntity {
  /** Upstream source label, e.g. "flightradar24", "aisstream". */
  source: string
  /** Stable per-source id (ICAO for aircraft, MMSI for vessels, etc.). */
  source_id: string
  /** Human-readable name — nullable. */
  name?: string | null
  /** Broad category, e.g. "aircraft", "vessel", "rail_vehicle", "camera". */
  entity_type: string
  lat: number
  lng: number
  /** ISO timestamp for when the record was observed. */
  occurred_at?: string | null
  /** Free-form JSON blob stored in the crep.* row. */
  properties?: Record<string, unknown>
}

export interface IngestOptions {
  /** MINDEX layer name, e.g. "aircraft_live", "vessel_live". */
  layer: string
  entities: MindexEntity[]
  /** Log prefix for this registry. Default: `[MindexIngest/${layer}]`. */
  logPrefix?: string
}

function authHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (MINDEX_API_KEY) return { "X-API-Key": MINDEX_API_KEY }
  return {}
}

function canIngest(): boolean {
  return !!(MINDEX_INTERNAL_TOKEN || MINDEX_API_KEY)
}

const BATCH_SIZE = 500

/**
 * POST entities to MINDEX `/api/mindex/ingest/{layer}` in chunks. Swallows
 * errors so the caller (primary registry fetch) is never delayed or
 * crashed by a cache-warming failure.
 */
export async function ingestToMindex(opts: IngestOptions): Promise<{
  sent: number
  batches: number
  errors: number
}> {
  const prefix = opts.logPrefix || `[MindexIngest/${opts.layer}]`

  if (!canIngest()) {
    // One-shot diag so local dev doesn't spam every 30 s poll.
    if (!(globalThis as any).__mindex_ingest_nocreds_warned) {
      ;(globalThis as any).__mindex_ingest_nocreds_warned = true
      console.warn(`${prefix} MINDEX_INTERNAL_TOKEN / MINDEX_API_KEY missing — skip ingest`)
    }
    return { sent: 0, batches: 0, errors: 0 }
  }

  const entities = (opts.entities || []).filter(
    (e) =>
      e &&
      typeof e.lat === "number" &&
      typeof e.lng === "number" &&
      Number.isFinite(e.lat) &&
      Number.isFinite(e.lng),
  )
  if (entities.length === 0) return { sent: 0, batches: 0, errors: 0 }

  const url = `${MINDEX_BASE}/api/mindex/ingest/${encodeURIComponent(opts.layer)}`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...authHeaders(),
  }

  let sent = 0
  let batches = 0
  let errors = 0
  for (let i = 0; i < entities.length; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE)
    batches++
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ entities: batch }),
        signal: AbortSignal.timeout(20_000),
      })
      if (res.ok) {
        sent += batch.length
      } else {
        errors++
        const txt = await res.text().catch(() => "")
        console.warn(`${prefix} batch ${batches} failed: ${res.status} ${txt.slice(0, 160)}`)
      }
    } catch (err: any) {
      errors++
      console.warn(`${prefix} batch ${batches} error: ${err?.message || err}`)
    }
  }
  if (sent > 0) {
    console.log(`${prefix} ingested ${sent}/${entities.length} entities (${batches} batch${batches === 1 ? "" : "es"}, ${errors} errors)`)
  }
  return { sent, batches, errors }
}
