import { NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { recordMindexEtlImprovement } from "@/lib/mindex/etl-improvement"

const MINDEX_API_URL = resolveMindexServerBaseUrl()
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || ""

interface MINDEXTaxon {
  id: string
  canonical_name: string
  scientific_name?: string
  common_name: string | null
  family?: string
  genus?: string
  kingdom?: string | null
  rank: string
  source: string
  description?: string
  metadata?: {
    inat_id?: number
    ancestry?: string
    parent_id?: number
    wikipedia_url?: string
    observations_count?: number
    default_photo?: {
      url?: string
      medium_url?: string
    }
    photos?: Array<{ url: string }>
    habitat?: string
    edibility?: string
  }
}

// Transform MINDEX taxon to ancestry species format
function transformToSpecies(taxon: MINDEXTaxon, index: number) {
  const metadata = taxon.metadata || {}
  
  // Extract characteristics from metadata
  const characteristics: string[] = []
  if (taxon.rank) characteristics.push(taxon.rank)
  if (metadata.observations_count && metadata.observations_count > 1000) characteristics.push("Common")
  if (metadata.observations_count && metadata.observations_count > 10000) characteristics.push("Very Common")
  if (taxon.source) characteristics.push(`Source: ${taxon.source}`)
  
  // Try to get image from metadata
  let imageUrl = null
  if (metadata.default_photo?.medium_url) {
    imageUrl = metadata.default_photo.medium_url
  } else if (metadata.default_photo?.url) {
    imageUrl = metadata.default_photo.url.replace("square", "medium")
  } else if (metadata.photos && metadata.photos.length > 0) {
    imageUrl = metadata.photos[0].url
  }
  
  // Extract family from ancestry if not available
  let family = taxon.family || "Unknown"
  
  return {
    id: index + 1, // Use numeric ID for compatibility
    uuid: taxon.id,
    scientific_name: taxon.scientific_name || taxon.canonical_name,
    common_name: taxon.common_name,
    kingdom: taxon.kingdom || null,
    family,
    description: taxon.description || null,
    image_url: imageUrl,
    characteristics,
    habitat: metadata.habitat || null,
    edibility: metadata.edibility || null,
    source: taxon.source,
    observations_count: metadata.observations_count || 0,
    wikipedia_url: metadata.wikipedia_url || null,
  }
}

function hasRequiredSpeciesImage(species: ReturnType<typeof transformToSpecies>) {
  const name = String(species.scientific_name || "").trim().toLowerCase()
  const rank = String(species.characteristics[0] || "").trim().toLowerCase()
  return Boolean(species.image_url && rank === "species" && name && name !== "life" && name !== "biota")
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")?.toLowerCase()
  const sort = (searchParams.get("sort") || "alphabetical").toLowerCase()
  const prefix = searchParams.get("prefix") || undefined
  const sourceParam = (searchParams.get("source") || "").trim().toLowerCase()
  const rankParam = (searchParams.get("rank") || "species").trim().toLowerCase()
  const kingdomParam = (searchParams.get("kingdom") || "all").trim()
  const lineageContains = searchParams.get("lineage_contains")?.trim()
  const filter = searchParams.get("filter")
  const category = searchParams.get("category")
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 10000)
  const page = parseInt(searchParams.get("page") || "1")

  try {
    // First, try to get data from MINDEX
    const offset = (page - 1) * limit
    const orderBy = sort === "popular" ? "observations_count" : "canonical_name"
    const order = sort === "popular" ? "desc" : "asc"
    const defaultSource = sort === "popular" ? "inat" : undefined
    const source =
      sourceParam && sourceParam !== "all" ? sourceParam : defaultSource

    const urlParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      order_by: orderBy,
      order,
    })

    // rank=all means "do not filter by rank"
    if (rankParam && rankParam !== "all") urlParams.set("rank", rankParam)
    if (source) urlParams.set("source", source)
    if (prefix) urlParams.set("prefix", prefix)
    if (kingdomParam && kingdomParam.toLowerCase() !== "all") {
      urlParams.set("kingdom", kingdomParam)
    }
    if (lineageContains) {
      urlParams.set("lineage_contains", lineageContains)
    }

    let url = `${MINDEX_API_URL}/api/mindex/taxa?${urlParams.toString()}`

    if (query) {
      // Search: pass same filters (kingdom, lineage) as list endpoint
      const sp = new URLSearchParams({
        q: query,
        limit: String(limit),
        offset: String(offset),
        order_by: orderBy,
        order,
      })
      if (rankParam && rankParam !== "all") sp.set("rank", rankParam)
      if (source) sp.set("source", source)
      if (kingdomParam && kingdomParam.toLowerCase() !== "all") sp.set("kingdom", kingdomParam)
      if (lineageContains) sp.set("lineage_contains", lineageContains)
      url = `${MINDEX_API_URL}/api/mindex/taxa?${sp.toString()}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MINDEX_API_KEY,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      
      // Handle search results vs taxa list
      let taxa: MINDEXTaxon[] = []
      if (data.local_results) {
        // Search response
        taxa = [...(data.local_results || []), ...(data.api_results || [])]
      } else if (data.data) {
        // Taxa list response
        taxa = data.data
      }

      if (taxa.length > 0) {
        let species = taxa
          .map((taxon, index) => transformToSpecies(taxon, (page - 1) * limit + index))
          .filter(hasRequiredSpeciesImage)

        // Apply filters
        if (filter && filter !== "All") {
          species = species.filter((s) =>
            s.characteristics.some((c) => c.toLowerCase().includes(filter.toLowerCase()))
          )
        }

        if (category && category !== "all") {
          species = species.filter((s) => {
            const chars = s.characteristics.map((c) => c.toLowerCase())
            switch (category) {
              case "edible":
                return chars.includes("edible") || s.edibility === "edible"
              case "medicinal":
                return chars.includes("medicinal")
              case "poisonous":
                return chars.includes("poisonous") || chars.includes("toxic")
              default:
                return true
            }
          })
        }

        const total = data.pagination?.total || data.total || species.length
        return NextResponse.json({
          species,
          total,
          page,
          pages: Math.ceil(total / limit),
          source: "mindex",
          sort,
          database_stats: {
            total_taxa: total,
            per_page: limit,
          }
        })
      }
    }

    // If MINDEX failed or returned no results, try direct search
    console.log("MINDEX query failed, trying fallback sources...")

  } catch (error) {
    console.log("MINDEX connection error:", error instanceof Error ? error.message : "Unknown error")
  }

  // External taxon APIs are enrichment inputs only. The Ancestry UI renders from
  // MINDEX/Supabase-backed records so observations can be audited, cached on NAS,
  // and reused instantly by MYCA/search instead of becoming one-off API reads.
  void recordMindexEtlImprovement({
    source: "ancestry-api",
    app: "ancestry",
    route: "/api/ancestry",
    query: query || undefined,
    missing: ["species", "taxonomy", "images", "popularity_counts"],
    context: { kingdom: kingdomParam, page, limit, category, sort },
  }).catch(() => {})

  return NextResponse.json({
    species: [],
    total: 0,
    page,
    pages: 0,
    source: "mindex_unavailable",
    message: "Live MINDEX ancestry data is unavailable. External taxonomy sources must be ingested into MINDEX before rendering.",
  })
}

// Verified iNat iconic roots (others: omit taxon_id to avoid wrong subtree).
const INAT_KINGDOM_TAXON: Partial<Record<string, string>> = {
  fungi: "47170",
  plantae: "47126",
}

// Fetch from external APIs directly. Kingdom-aware, and visual-card safe.
async function fetchFromExternalAPIs(query: string, limit: number, kingdom: string) {
  const species: any[] = []
  let total = 0
  const k = kingdom.trim().toLowerCase()

  try {
    // iNaturalist — only restrict to subtree for kingdoms with verified taxon_id
    const inatUrl = new URL("https://api.inaturalist.org/v1/taxa/autocomplete")
    inatUrl.searchParams.set("q", query)
    inatUrl.searchParams.set("per_page", String(limit))
    const inatRoot = k !== "all" ? INAT_KINGDOM_TAXON[k] : undefined
    if (inatRoot) inatUrl.searchParams.set("taxon_id", inatRoot)
    const inatResponse = await fetch(inatUrl.toString(), {
        headers: {
          "User-Agent": "MYCOSOFT-Ancestry/1.0 (https://mycosoft.io)",
          "Accept": "application/json",
        },
      }
    )

    if (inatResponse.ok) {
      const data = await inatResponse.json()
      if (typeof data.total_results === "number") {
        total = data.total_results
      } else {
        total = (data.results || []).length
      }
      for (const taxon of data.results || []) {
        const imageUrl = taxon.default_photo?.medium_url || taxon.default_photo?.url || null
        const rank = String(taxon.rank || "").toLowerCase()
        const name = String(taxon.name || "").toLowerCase()
        if (!imageUrl || rank !== "species" || name === "life" || name === "biota") continue
        const iconic = taxon.iconic_taxon_name || "Unknown"
        species.push({
          id: taxon.id,
          scientific_name: taxon.name,
          common_name: taxon.preferred_common_name || null,
          family: taxon.family || iconic,
          kingdom: iconic,
          description: taxon.wikipedia_summary || null,
          image_url: imageUrl,
          characteristics: [
            taxon.rank || "species",
            `${taxon.observations_count || 0} observations`,
          ],
          habitat: null,
          source: "iNaturalist",
          observations_count: taxon.observations_count || 0,
        })
      }
    }
  } catch (error) {
    console.error("iNaturalist fetch error:", error)
  }

  if (species.length && !total) total = species.length
  return { species, total }
}
