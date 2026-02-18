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

/** Parse the full taxonomy tree from iNaturalist ancestor array. */
function parseTaxonomyFromAncestors(ancestors: any[], taxonName: string) {
  const taxonomy: Record<string, string | null> = {
    kingdom: null, subkingdom: null, phylum: null, subphylum: null,
    class: null, subclass: null, order: null, family: null, genus: null,
  }
  const ancestorList: Array<{ id: number; name: string; rank: string; common_name?: string }> = []

  for (const a of ancestors || []) {
    const rank = (a.rank || "").toLowerCase()
    if (taxonomy.hasOwnProperty(rank) && a.name && a.name !== "Life") {
      taxonomy[rank] = a.name
    }
    if (rank !== "stateofmatter") {
      ancestorList.push({
        id: a.id,
        name: a.name,
        rank: a.rank,
        common_name: a.preferred_common_name || null,
      })
    }
  }

  // If genus is empty, infer from binomial name
  if (!taxonomy.genus && taxonName?.includes(" ")) {
    taxonomy.genus = taxonName.split(" ")[0]
  }

  return { taxonomy, ancestorList }
}

/** Try Wikipedia image API as fallback when iNaturalist has no photo. */
async function fetchWikipediaImage(name: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&format=json&pithumbsize=400&origin=*`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const d = await res.json()
    const pages = d?.query?.pages || {}
    const page = Object.values(pages)[0] as any
    return page?.thumbnail?.source || null
  } catch {
    return null
  }
}

async function fetchFromINaturalist(nameOrId: string) {
  const isId = /^\d+$/.test(nameOrId)
  let taxon: any = null

  if (isId) {
    // Direct taxon fetch by ID — always returns ancestors + photos
    const res = await fetch(
      `${INAT_BASE}/taxa/${nameOrId}?include=ancestors`,
      { signal: AbortSignal.timeout(10000), headers: INAT_HEADERS }
    )
    if (!res.ok) return null
    const d = await res.json()
    taxon = d?.results?.[0] || null
  } else {
    // Name search
    const res = await fetch(
      `${INAT_BASE}/taxa?q=${encodeURIComponent(nameOrId)}&rank=species,genus,family&per_page=1&is_active=true`,
      { signal: AbortSignal.timeout(10000), headers: INAT_HEADERS }
    )
    if (!res.ok) return null
    const d = await res.json()
    taxon = d?.results?.[0] || null

    // Always fetch full detail to get wikipedia_summary + ancestors + taxon_photos
    if (taxon?.id) {
      try {
        const full = await fetch(
          `${INAT_BASE}/taxa/${taxon.id}?include=ancestors`,
          { signal: AbortSignal.timeout(8000), headers: INAT_HEADERS }
        )
        if (full.ok) {
          const fd = await full.json()
          taxon = fd?.results?.[0] || taxon
        }
      } catch { /* keep original taxon */ }
    }
  }

  if (!taxon) return null

  // Build photo list — prefer taxon_photos (higher quality), fall back to default_photo
  const rawPhotos = taxon.taxon_photos?.length
    ? taxon.taxon_photos.map((tp: any) => tp.photo).filter(Boolean)
    : taxon.default_photo
      ? [taxon.default_photo]
      : []

  let photos = rawPhotos.slice(0, 8).map((p: any) => ({
    id: p.id,
    url: p.medium_url || p.square_url || "",
    large_url: p.large_url || p.medium_url || "",
    attribution: p.attribution || "iNaturalist",
  }))

  // If no photos, try Wikipedia as fallback
  if (photos.length === 0) {
    const wikiImg = await fetchWikipediaImage(taxon.name)
    if (wikiImg) {
      photos = [{ id: "wiki", url: wikiImg, large_url: wikiImg, attribution: "Wikipedia" }]
    }
  }

  // Parse full taxonomy from ancestors
  const { taxonomy, ancestorList } = parseTaxonomyFromAncestors(taxon.ancestors || [], taxon.name)

  // Clean description
  const description = taxon.wikipedia_summary
    ? taxon.wikipedia_summary.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    : null

  return {
    id: taxon.id,
    inat_id: taxon.id,
    name: taxon.name,
    common_name: taxon.preferred_common_name || taxon.english_common_name || null,
    rank: taxon.rank || "species",
    ancestry: taxon.ancestry || null,
    description,
    wikipedia_url: taxon.wikipedia_url || null,
    observation_count: taxon.observations_count || 0,
    photos,
    conservation_status: taxon.conservation_status?.status_name || null,
    // Full parsed taxonomy (not hardcoded!)
    taxonomy,
    // Ordered ancestor list for breadcrumb display
    ancestors: ancestorList,
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

  // ── 1. Try MINDEX taxa — only for numeric ID lookups (name lookups are too
  //       fuzzy and return wrong records, same as the compounds issue) ─────────
  if (rawId && /^\d+$/.test(rawId)) {
    try {
      const res = await fetch(`${MINDEX_TAXA}?id=${encodeURIComponent(rawId)}&limit=1`, {
        headers: mindexHeaders(),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      })
      if (res.ok) {
        const d = await res.json()
        const item = d?.data?.[0] || d?.[0] || d
        // Only use if it has real data (description + taxonomy set)
        if ((item?.scientific_name || item?.name) && item?.description) return NextResponse.json(item)
      }
    } catch { /* fall through */ }
  }

  // ── 2. iNaturalist direct — primary source for all species lookups ─────────
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
