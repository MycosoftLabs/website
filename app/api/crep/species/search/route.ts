/**
 * Species Search API
 *
 * Searches the MINDEX species catalog by common or scientific name.
 * Falls back to iNaturalist taxa search when MINDEX returns 0 results.
 *
 * @route GET /api/crep/species/search?q=amanita&limit=20
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_URL =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_URL ||
  "http://192.168.0.189:8000"

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"
const INATURALIST_API = "https://api.inaturalist.org/v1"

/** Simple in-memory cache: key -> { data, ts } */
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL_MS = 30_000 // 30 seconds

function getCached(key: string): unknown | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data
  return null
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() })
  // Prune old entries periodically to avoid memory leak
  if (cache.size > 200) {
    const now = Date.now()
    for (const [k, v] of cache) {
      if (now - v.ts > CACHE_TTL_MS) cache.delete(k)
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").trim()
  const limit = Math.min(parseInt(searchParams.get("limit") || "20") || 20, 100)

  if (!q) {
    return NextResponse.json(
      { error: "Missing query parameter: q" },
      { status: 400 },
    )
  }

  const cacheKey = `species:${q}:${limit}`
  const cached = getCached(cacheKey)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "hit", "Cache-Control": "public, max-age=30" },
    })
  }

  // ---- 1. Try MINDEX species layer first ----
  let mindexResults: any[] = []
  try {
    const mindexUrl = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=species&query=${encodeURIComponent(q)}&limit=${limit}&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180`
    const res = await fetch(mindexUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json", "X-API-Key": MINDEX_API_KEY },
    })
    if (res.ok) {
      const data = await res.json()
      const raw = data.entities || data.results || data.data || []
      mindexResults = raw.map((e: any) => ({
        id: e.id,
        name: e.common_name || e.species_name || e.scientific_name || "Unknown",
        scientific_name: e.scientific_name || e.species_name || null,
        kingdom: e.kingdom || e.iconic_taxon || null,
        image_url: e.image_url || e.thumbnail_url || null,
        observation_count: e.observation_count ?? 1,
        last_seen_lat: e.lat ?? e.latitude ?? null,
        last_seen_lng: e.lng ?? e.longitude ?? null,
        source: "mindex",
      }))
    }
  } catch {
    // MINDEX unreachable -- fall through to iNaturalist
  }

  if (mindexResults.length > 0) {
    const payload = {
      results: mindexResults,
      total: mindexResults.length,
      source: "mindex",
      query: q,
    }
    setCache(cacheKey, payload)
    return NextResponse.json(payload, {
      headers: { "X-Cache": "miss", "Cache-Control": "public, max-age=30" },
    })
  }

  // ---- 2. Fallback: iNaturalist taxa search ----
  try {
    const params = new URLSearchParams({
      q,
      per_page: String(limit),
      is_active: "true",
    })
    const res = await fetch(`${INATURALIST_API}/taxa?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      const data = await res.json()
      const inatResults = (data.results || []).map((t: any) => ({
        id: `inat-taxon-${t.id}`,
        name: t.preferred_common_name || t.name || "Unknown",
        scientific_name: t.name || null,
        kingdom: t.iconic_taxon_name || null,
        image_url: t.default_photo?.medium_url || t.default_photo?.square_url || null,
        observation_count: t.observations_count ?? 0,
        last_seen_lat: null,
        last_seen_lng: null,
        source: "inaturalist",
      }))

      const payload = {
        results: inatResults,
        total: inatResults.length,
        source: "inaturalist",
        query: q,
      }
      setCache(cacheKey, payload)
      return NextResponse.json(payload, {
        headers: { "X-Cache": "miss", "Cache-Control": "public, max-age=30" },
      })
    }
  } catch {
    // iNaturalist also unreachable
  }

  // Both sources failed
  return NextResponse.json(
    { results: [], total: 0, source: "none", query: q, error: "No results from MINDEX or iNaturalist" },
    { status: 200 },
  )
}
