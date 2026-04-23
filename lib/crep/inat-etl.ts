/**
 * iNaturalist → MINDEX ETL
 *
 * Pulls observations from iNaturalist and persists them to MINDEX so
 * CREP (and every other consumer) can search/visualize without hammering
 * the iNat API on every request.
 *
 * Two modes:
 *
 *   1. BULK BACKFILL — for seeding MINDEX with ~300M existing iNat
 *      observations. Cursor-paginates by `id_above` ascending. Safe to
 *      resume because cursor state is persisted.
 *
 *   2. DELTA SYNC — for keeping MINDEX fresh with brand-new iNat
 *      observations. Query by `created_since` (ISO timestamp) +
 *      `order=asc&order_by=created_at`. Run on a cron every ~5 minutes.
 *
 * Both modes POST to MINDEX `/api/mindex/observations/bulk` which the
 * MINDEX side deduplicates on (source, source_id). Safe to re-run.
 *
 * Rate limits:
 *   - iNat allows ~1 req/sec unauthenticated, 2/sec with API token.
 *     We sleep 1.2s between pages to stay well under the limit.
 *   - iNat recommends no more than 60 pages per minute — we enforce.
 *
 * This module does NOT run anywhere automatically. It's invoked by:
 *   - /api/etl/inat/sync (short delta sync triggered by a cron)
 *   - scripts/inat-backfill.ts (long-running bulk backfill)
 */

import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

const INAT_API = "https://api.inaturalist.org/v1"
const MINDEX_API = resolveMindexServerBaseUrl()
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

const PAGE_SIZE = 200 // iNat max
const INTER_PAGE_MS = 1200 // stay under 1 req/sec
const PAGE_TIMEOUT_MS = 30_000 // 30s per page
const MINDEX_POST_TIMEOUT_MS = 60_000 // 60s per bulk POST

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

export interface EtlResult {
  mode: "bulk" | "delta"
  pagesFetched: number
  observationsFetched: number
  observationsPosted: number
  mindexErrors: number
  startedAt: string
  finishedAt: string
  nextCursor: string | null
  note?: string
}

/**
 * Delta sync: fetch everything created after `sinceIso` (defaults to 1h ago)
 * up to `maxPages` pages. Used by cron.
 */
export async function deltaSyncINat(options: {
  sinceIso?: string
  maxPages?: number
  signal?: AbortSignal
}): Promise<EtlResult> {
  const maxPages = options.maxPages ?? 10 // ~2000 obs per run
  const sinceIso = options.sinceIso ?? new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const startedAt = new Date().toISOString()

  let pages = 0
  let totalFetched = 0
  let totalPosted = 0
  let errors = 0
  let nextCursor: string | null = null

  // iNat pagination via `page=N` + `order=desc&order_by=created_at` for
  // delta. We stop when we see an obs created before sinceIso.
  for (let page = 1; page <= maxPages; page++) {
    if (options.signal?.aborted) break
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(PAGE_SIZE),
      order: "desc",
      order_by: "created_at",
      geo: "true",
      d1: sinceIso,
    })

    const batch = await fetchINatPage(params, options.signal)
    if (!batch) {
      errors++
      break
    }
    pages++
    if (batch.length === 0) break
    totalFetched += batch.length

    // Stop when we've crossed back over `sinceIso`
    const oldest = batch[batch.length - 1]?.created_at
    if (oldest && new Date(oldest).getTime() < new Date(sinceIso).getTime()) {
      // Trim to only those after sinceIso
      const trimmed = batch.filter((o: any) =>
        o.created_at && new Date(o.created_at).getTime() >= new Date(sinceIso).getTime(),
      )
      const posted = await postToMindex(trimmed)
      totalPosted += posted.posted
      errors += posted.errors
      break
    }

    const posted = await postToMindex(batch)
    totalPosted += posted.posted
    errors += posted.errors
    nextCursor = String(batch[batch.length - 1]?.id ?? "")
    if (batch.length < PAGE_SIZE) break
    await sleep(INTER_PAGE_MS, options.signal)
  }

  return {
    mode: "delta",
    pagesFetched: pages,
    observationsFetched: totalFetched,
    observationsPosted: totalPosted,
    mindexErrors: errors,
    startedAt,
    finishedAt: new Date().toISOString(),
    nextCursor,
    note: `sinceIso=${sinceIso}`,
  }
}

/**
 * Bulk backfill: cursor-paginates from `idAbove` upward. Each call processes
 * `maxPages` pages so the caller can chunk the 300M-observation walk into
 * resumable segments.
 *
 * Returns the `nextCursor` (last id seen). Persist this client-side and pass
 * it back in as `idAbove` on the next call.
 */
export async function bulkBackfillINat(options: {
  idAbove?: number
  maxPages?: number
  signal?: AbortSignal
}): Promise<EtlResult> {
  const maxPages = options.maxPages ?? 30
  const startedAt = new Date().toISOString()
  let cursor = options.idAbove ?? 0
  let pages = 0
  let totalFetched = 0
  let totalPosted = 0
  let errors = 0

  for (let page = 0; page < maxPages; page++) {
    if (options.signal?.aborted) break
    const params = new URLSearchParams({
      id_above: String(cursor),
      per_page: String(PAGE_SIZE),
      order: "asc",
      order_by: "id",
      geo: "true",
    })
    const batch = await fetchINatPage(params, options.signal)
    if (!batch) {
      errors++
      break
    }
    pages++
    if (batch.length === 0) break

    totalFetched += batch.length
    const posted = await postToMindex(batch)
    totalPosted += posted.posted
    errors += posted.errors

    cursor = Number(batch[batch.length - 1]?.id ?? cursor)
    if (batch.length < PAGE_SIZE) break
    await sleep(INTER_PAGE_MS, options.signal)
  }

  return {
    mode: "bulk",
    pagesFetched: pages,
    observationsFetched: totalFetched,
    observationsPosted: totalPosted,
    mindexErrors: errors,
    startedAt,
    finishedAt: new Date().toISOString(),
    nextCursor: String(cursor),
  }
}

// ─────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────

async function fetchINatPage(
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<any[] | null> {
  try {
    const url = `${INAT_API}/observations?${params}`
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), PAGE_TIMEOUT_MS)
    if (signal) signal.addEventListener("abort", () => ac.abort(), { once: true })
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mycosoft-CREP-ETL/1.0 (+https://mycosoft.com)",
      },
      signal: ac.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      console.warn(`[iNatETL] page fetch ${res.status}`)
      return null
    }
    const data = await res.json()
    return (data.results as any[]) || []
  } catch (e) {
    console.warn(`[iNatETL] page fetch error: ${(e as Error)?.message}`)
    return null
  }
}

/**
 * Transform iNat observation records into MINDEX-schema payload and POST
 * as a single bulk request. Returns how many we successfully posted.
 */
async function postToMindex(observations: any[]): Promise<{ posted: number; errors: number }> {
  if (!observations.length) return { posted: 0, errors: 0 }

  const payload = observations
    .map((o) => ({
      source: "inat",
      source_id: String(o.id),
      observed_at: o.observed_on || o.created_at || null,
      observer: o.user?.login ?? null,
      lat: o.geojson?.coordinates?.[1] ?? null,
      lng: o.geojson?.coordinates?.[0] ?? null,
      taxon_name: o.taxon?.name ?? null,
      taxon_common_name: o.taxon?.preferred_common_name ?? null,
      taxon_inat_id: o.taxon?.id ?? null,
      iconic_taxon_name: o.taxon?.iconic_taxon_name ?? null,
      photos: (o.photos || []).map((p: any) => ({
        url: p.url?.replace("square", "medium") ?? null,
        attribution: p.attribution ?? "© iNaturalist",
        license_code: p.license_code ?? null,
      })),
      notes: o.description ?? null,
      metadata: {
        uri: o.uri ?? `https://www.inaturalist.org/observations/${o.id}`,
        place_guess: o.place_guess ?? null,
        quality_grade: o.quality_grade ?? null,
        etl_pipeline: "inat-etl",
      },
    }))
    .filter((p) => p.lat != null && p.lng != null && p.source_id) // no-GPS / no-ID obs skipped

  if (!payload.length) return { posted: 0, errors: 0 }

  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), MINDEX_POST_TIMEOUT_MS)
    const res = await fetch(`${MINDEX_API}/api/mindex/observations/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MINDEX_API_KEY,
      },
      body: JSON.stringify({ observations: payload }),
      signal: ac.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      console.warn(`[iNatETL] MINDEX bulk POST returned ${res.status}`)
      return { posted: 0, errors: 1 }
    }
    return { posted: payload.length, errors: 0 }
  } catch (e) {
    console.warn(`[iNatETL] MINDEX bulk POST error: ${(e as Error)?.message}`)
    return { posted: 0, errors: 1 }
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t)
        reject(new Error("aborted"))
      },
      { once: true },
    )
  })
}

// ─────────────────────────────────────────────────────────────────────
// In-memory sync state — lives in Node process, NOT durable across
// restarts. The bulk backfill script persists its cursor to a file so
// it can resume. The delta-sync cron just fetches "last hour" each time
// and is idempotent via MINDEX dedup on (source, source_id).
// ─────────────────────────────────────────────────────────────────────

let lastSyncAt: string | null = null
let lastResult: EtlResult | null = null
let totalObservationsAllTime = 0

export function recordSyncRun(r: EtlResult) {
  lastSyncAt = r.finishedAt
  lastResult = r
  totalObservationsAllTime += r.observationsPosted
}

export function getSyncStatus() {
  return {
    lastSyncAt,
    lastResult,
    totalObservationsAllTime,
    mindexApi: MINDEX_API,
    hasApiKey: !!process.env.MINDEX_API_KEY,
  }
}
