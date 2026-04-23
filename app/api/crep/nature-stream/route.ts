/**
 * CREP Nature Stream (Server-Sent Events)
 *
 * Long-running SSE endpoint the CREP dashboard can subscribe to for
 * live nature observations. Polls iNaturalist every 60 seconds for
 * any observation created since the last poll, pushes each new one
 * as a `nature` event to every connected client, and in the background
 * also fires the bulk POST to MINDEX so the observation is persisted
 * at the same time it reaches the user's map.
 *
 * Usage (browser):
 *   const es = new EventSource("/api/crep/nature-stream");
 *   es.addEventListener("nature", (e) => {
 *     const obs = JSON.parse(e.data);
 *     // add dot to map
 *   });
 *
 * Usage (CLI):
 *   curl -N https://mycosoft.com/api/crep/nature-stream
 *
 * Rate: 1 poll / 60s to stay under iNat's limit. One poll returns up
 * to 200 new obs (iNat page size); more backlog = longer catch-up.
 *
 * @route GET /api/crep/nature-stream
 */

import { NextRequest } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300 // 5 min connection lifetime, then client reconnects

const INAT_API = "https://api.inaturalist.org/v1"
const MINDEX_API = resolveMindexServerBaseUrl()
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"
const POLL_MS = 60_000 // 1 minute
const HEARTBEAT_MS = 30_000 // 30s

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          )
        } catch {
          // client disconnected
        }
      }

      send("hello", { ts: new Date().toISOString(), note: "CREP nature stream — iNat live + clone to MINDEX" })

      // Track the most recent iNat observation ID so we only emit new ones
      let lastIdSeen = 0
      const seed = await fetchINatLatest(0, 1)
      if (seed.length) lastIdSeen = Number(seed[0].id)

      // Heartbeat to keep connection alive through middleboxes
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {}
      }, HEARTBEAT_MS)

      // Poll loop
      const poll = setInterval(async () => {
        try {
          const fresh = await fetchINatLatest(lastIdSeen, 200)
          if (fresh.length === 0) return
          // iNat returns DESC by default; the NEWEST is first. Update watermark.
          const newestId = Number(fresh[0].id)
          if (newestId > lastIdSeen) lastIdSeen = newestId

          // Emit in chronological order (oldest first) so the map animates naturally
          const ordered = [...fresh].reverse()
          for (const o of ordered) {
            const lat = o.geojson?.coordinates?.[1]
            const lng = o.geojson?.coordinates?.[0]
            if (lat == null || lng == null) continue
            send("nature", {
              id: `inat-${o.id}`,
              source: "iNaturalist",
              species: o.taxon?.preferred_common_name || o.taxon?.name || "Unknown",
              scientificName: o.taxon?.name || "Unknown",
              commonName: o.taxon?.preferred_common_name,
              lat,
              lng,
              timestamp: o.observed_on || o.created_at,
              iconicTaxon: o.taxon?.iconic_taxon_name,
              kingdom: o.taxon?.iconic_taxon_name,
              photos: (o.photos || []).slice(0, 1).map((p: any) => p.url?.replace("square", "medium")),
              sourceUrl: `https://www.inaturalist.org/observations/${o.id}`,
              observer: o.user?.login,
              placeGuess: o.place_guess,
            })
          }

          // Fire-and-forget: persist the batch to MINDEX
          cloneToMindex(ordered)
        } catch (e) {
          console.warn("[nature-stream] poll error:", (e as Error)?.message)
        }
      }, POLL_MS)

      // Clean up when client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        clearInterval(poll)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx: don't buffer SSE
    },
  })
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

async function fetchINatLatest(idAbove: number, perPage: number): Promise<any[]> {
  const params = new URLSearchParams({
    per_page: String(Math.min(perPage, 200)),
    order: "desc",
    order_by: "id",
    geo: "true",
    ...(idAbove > 0 ? { id_above: String(idAbove) } : {}),
  })
  try {
    const res = await fetch(`${INAT_API}/observations?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mycosoft-CREP-Stream/1.0 (+https://mycosoft.com)",
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results as any[]) || []
  } catch {
    return []
  }
}

async function cloneToMindex(observations: any[]) {
  if (!observations.length) return
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
        etl_pipeline: "nature-stream-sse",
      },
    }))
    .filter((p) => p.lat != null && p.lng != null)

  if (!payload.length) return
  try {
    await fetch(`${MINDEX_API}/api/mindex/observations/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MINDEX_API_KEY,
      },
      body: JSON.stringify({ observations: payload }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    // non-blocking — the stream's job is to push to clients; MINDEX is secondary
  }
}
