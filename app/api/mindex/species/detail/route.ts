/**
 * Species / Taxonomy Detail API - Feb 2026
 *
 * GET ?name=Amanita+muscaria | ?id=inat-12345 | ?id=mindex-123
 *
 * Lookup priority:
 *   1. MINDEX taxa by name or id (fast, in-DB)
 *   2. iNaturalist taxon API (free, rich data: photos, Wikipedia, distribution)
 *      → then stores in MINDEX background so next lookup hits priority 1
 *
 * System-wide pattern: same auto-scrape-and-store approach as genetics/chemistry.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")
const MINDEX_TAXA = `${MINDEX_API_URL}/api/mindex/taxa`
const INAT_BASE = "https://api.inaturalist.org/v1"
const INAT_HEADERS = { "User-Agent": "Mycosoft/1.0 (mycosoft.com; dev@mycosoft.org)" }

const mindexHeaders = () => ({
  "X-API-Key": env.mindexApiKey || "",
  "Content-Type": "application/json",
})

// ---------------------------------------------------------------------------
// iNaturalist helpers
// ---------------------------------------------------------------------------

async function fetchFromINaturalist(nameOrId: string) {
  const isId = /^\d+$/.test(nameOrId)
  let taxon: any = null

  if (isId) {
    const res = await fetch(`${INAT_BASE}/taxa/${nameOrId}`, {
      signal: AbortSignal.timeout(10000), headers: INAT_HEADERS
    })
    if (!res.ok) return null
    const d = await res.json()
    taxon = d?.results?.[0] || null
  } else {
    const res = await fetch(
      `${INAT_BASE}/taxa?q=${encodeURIComponent(nameOrId)}&rank=species,genus,family&per_page=1&is_active=true`,
      { signal: AbortSignal.timeout(10000), headers: INAT_HEADERS }
    )
    if (!res.ok) return null
    const d = await res.json()
    taxon = d?.results?.[0] || null
    // Fetch full taxon detail by ID to get wikipedia_summary + taxon_photos
    if (taxon?.id && !taxon.wikipedia_summary) {
      try {
        const full = await fetch(`${INAT_BASE}/taxa/${taxon.id}`, {
          signal: AbortSignal.timeout(8000), headers: INAT_HEADERS
        })
        if (full.ok) {
          const fd = await full.json()
          taxon = fd?.results?.[0] || taxon
        }
      } catch { /* keep original taxon */ }
    }
  }

  if (!taxon) return null

  // iNaturalist includes default_photo in basic responses; taxon_photos is richer but optional
  const rawPhotos = taxon.taxon_photos?.length
    ? taxon.taxon_photos.map((tp: any) => tp.photo).filter(Boolean)
    : taxon.default_photo
      ? [taxon.default_photo]
      : []
  const photos = rawPhotos.slice(0, 6).map((p: any) => ({
    id: p.id,
    url: p.medium_url || p.square_url,
    attribution: p.attribution,
  }))

  return {
    id: taxon.id,
    inat_id: taxon.id,
    name: taxon.name,
    common_name: taxon.preferred_common_name || taxon.english_common_name || null,
    rank: taxon.rank || "species",
    ancestry: taxon.ancestry || null,
    description: taxon.wikipedia_summary
      ? taxon.wikipedia_summary.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      : null,
    wikipedia_url: taxon.wikipedia_url || null,
    observation_count: taxon.observations_count || 0,
    photos,
    conservation_status: taxon.conservation_status?.status_name || null,
    taxonomy: {
      kingdom: taxon.ancestor_ids ? "Fungi" : null,
      phylum: null,
      class: null,
      order: null,
      family: null,
      genus: taxon.name?.split(" ")?.[0] || null,
    },
    source: "iNaturalist",
    source_url: `https://www.inaturalist.org/taxa/${taxon.id}`,
    _source: "inaturalist_direct",
  }
}

function storeSpeciesInBackground(species: NonNullable<Awaited<ReturnType<typeof fetchFromINaturalist>>>) {
  if (!species.name) return
  void fetch(`${MINDEX_TAXA}`, {
    method: "POST",
    headers: mindexHeaders(),
    body: JSON.stringify({
      scientific_name: species.name,
      common_name: species.common_name,
      rank: species.rank,
      description: species.description,
      image_url: species.photos?.[0]?.url,
      observation_count: species.observation_count,
    }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  }).catch(() => {})
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")
  const name = searchParams.get("name")

  if (!id && !name) {
    return NextResponse.json({ error: "Provide id or name" }, { status: 400 })
  }

  // Strip common prefixes to get the raw id
  const rawId = id?.replace(/^(inat-|mindex-)/, "") || ""

  // ── 1. Try MINDEX taxa ────────────────────────────────────────────────────
  if (rawId || name) {
    try {
      const param = name
        ? `search=${encodeURIComponent(name)}&limit=1`
        : `id=${encodeURIComponent(rawId)}`
      const res = await fetch(`${MINDEX_TAXA}?${param}`, {
        headers: mindexHeaders(),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      })
      if (res.ok) {
        const d = await res.json()
        const item = d?.data?.[0] || d?.[0] || d
        if (item?.scientific_name || item?.name) return NextResponse.json(item)
      }
    } catch { /* fall through */ }
  }

  // ── 2. iNaturalist direct ─────────────────────────────────────────────────
  const lookupValue = name || rawId
  try {
    const species = await fetchFromINaturalist(lookupValue)
    if (species) {
      storeSpeciesInBackground(species)
      return NextResponse.json(species)
    }
  } catch { /* fall through */ }

  return NextResponse.json({ error: "Species not found" }, { status: 404 })
}
