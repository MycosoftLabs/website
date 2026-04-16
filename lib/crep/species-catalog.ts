/**
 * Species Observation Persistence Pipeline
 *
 * Every biodiversity observation flowing through CREP gets persisted to MINDEX
 * for offline access, search, and catalog building.
 *
 * All ingest calls are fire-and-forget so they never block the render pipeline.
 * Observations are deduplicated by ID before ingesting.
 *
 * This module is used by BOTH server-side route handlers and the client-side
 * dashboard, so it defines its own minimal observation interface rather than
 * importing a specific server/client type.
 */

/** Minimal observation shape accepted by the ingest functions.
 *  Compatible with both the server-side FungalObservation (route.ts) and
 *  the client-side FungalObservation (fungal-marker.tsx). */
export interface IngestableObservation {
  id: string | number
  species?: string
  scientificName?: string
  commonName?: string
  latitude: number
  longitude: number
  timestamp?: string
  observed_on?: string
  source?: string
  sourceUrl?: string
  observer?: string
  user?: string
  imageUrl?: string
  thumbnailUrl?: string
  verified?: boolean
  quality_grade?: string
  kingdom?: string
  iconicTaxon?: string
  taxonId?: number
  taxon_id?: number
  taxon?: { id?: number; name?: string; preferred_common_name?: string }
  photos?: Array<{ url?: string }>
}

const MINDEX_PROXY_BASE = "/api/mindex/proxy/species"
const BATCH_MAX = 500

/** Set of observation IDs already sent to MINDEX this session (dedup guard) */
const ingestedIds = new Set<string>()

/**
 * Persist a single observation to MINDEX via the proxy endpoint.
 * Fire-and-forget -- never throws.
 */
export async function ingestObservationToMINDEX(
  observation: IngestableObservation,
): Promise<void> {
  const key = String(observation.id)
  if (ingestedIds.has(key)) return
  ingestedIds.add(key)

  try {
    await fetch(MINDEX_PROXY_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entities: [flattenObservation(observation)],
      }),
    })
  } catch {
    // Fire-and-forget -- swallow errors silently
  }
}

/**
 * Persist a batch of observations to MINDEX (max 500 per request).
 * Deduplicates by observation ID before sending.
 * Fire-and-forget -- never throws.
 */
export async function ingestBatchToMINDEX(
  observations: IngestableObservation[],
): Promise<void> {
  // Deduplicate: skip observations already ingested this session
  const fresh = observations.filter((o) => !ingestedIds.has(String(o.id)))
  if (fresh.length === 0) return

  // Mark all as ingested upfront to avoid double-sends from concurrent calls
  for (const o of fresh) ingestedIds.add(String(o.id))

  // Chunk into batches of BATCH_MAX
  for (let i = 0; i < fresh.length; i += BATCH_MAX) {
    const chunk = fresh.slice(i, i + BATCH_MAX)
    try {
      await fetch(MINDEX_PROXY_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: chunk.map(flattenObservation),
        }),
      })
    } catch {
      // Fire-and-forget -- swallow errors silently
    }
  }
}

/**
 * Search the MINDEX species catalog by common or scientific name.
 */
export async function searchSpeciesInMINDEX(
  query: string,
  limit: number = 20,
): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      query,
      limit: String(limit),
    })
    const res = await fetch(`${MINDEX_PROXY_BASE}?${params}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.entities || data.results || data.data || []
  } catch {
    return []
  }
}

/**
 * Retrieve a specific species record from MINDEX by iNaturalist taxon ID.
 */
export async function getSpeciesByTaxonId(
  taxonId: number,
): Promise<any | null> {
  try {
    const params = new URLSearchParams({
      query: String(taxonId),
      limit: "1",
    })
    const res = await fetch(`${MINDEX_PROXY_BASE}?${params}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const results = data.entities || data.results || data.data || []
    return results[0] ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Flatten an observation into the flat JSON shape expected by the
 * MINDEX proxy POST endpoint. Handles both server-side and client-side
 * observation shapes gracefully.
 */
function flattenObservation(obs: IngestableObservation): Record<string, unknown> {
  // Resolve fields that differ between server and client observation types
  const scientificName =
    obs.scientificName || obs.taxon?.name || obs.species || "Unknown"
  const commonName =
    obs.commonName || obs.taxon?.preferred_common_name || null
  const taxonId = obs.taxonId ?? obs.taxon_id ?? obs.taxon?.id ?? null
  const timestamp = obs.timestamp || obs.observed_on || null
  const observer = obs.observer || obs.user || null
  const qualityGrade =
    obs.quality_grade || (obs.verified ? "research" : "needs_id")
  const imageUrl =
    obs.imageUrl || obs.photos?.[0]?.url || obs.thumbnailUrl || null

  return {
    id: String(obs.id),
    taxon_id: taxonId,
    species_name: obs.species || commonName || scientificName,
    scientific_name: scientificName,
    common_name: commonName,
    kingdom: obs.kingdom || null,
    iconic_taxon: obs.iconicTaxon || null,
    lat: obs.latitude,
    lng: obs.longitude,
    altitude: null,
    timestamp,
    observed_on: timestamp,
    observer,
    quality_grade: qualityGrade,
    source: obs.source || null,
    source_url: obs.sourceUrl || null,
    image_url: imageUrl,
    thumbnail_url: obs.thumbnailUrl || null,
  }
}
