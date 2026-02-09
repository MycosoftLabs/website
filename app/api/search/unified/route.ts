/**
 * Unified Search API Route - Feb 2026
 *
 * MINDEX-FIRST architecture:
 * 1. PRIMARY: Query MINDEX API (192.168.0.189:8000) for species, compounds, sequences, research
 * 2. SECONDARY: iNaturalist for live observation data and species not in MINDEX
 * 3. MERGE: MINDEX results first, iNaturalist additive, deduplicate by scientific name
 *
 * NO MOCK DATA - all results from real sources.
 */

import { NextRequest, NextResponse } from "next/server"
import { searchFungi } from "@/lib/services/inaturalist"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_DIRECT_URL || "http://192.168.0.189:8000"

// ---------------------------------------------------------------------------
// MINDEX queries (PRIMARY)
// ---------------------------------------------------------------------------

async function searchMindexSpecies(query: string, limit: number) {
  try {
    const res = await fetch(
      `${MINDEX_API_URL}/mindex/species/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch {
    return []
  }
}

async function searchMindexCompounds(query: string, limit: number) {
  try {
    const res = await fetch(
      `${MINDEX_API_URL}/mindex/compounds/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch {
    return []
  }
}

async function searchMindexSequences(query: string, limit: number) {
  try {
    const res = await fetch(
      `${MINDEX_API_URL}/mindex/sequences/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch {
    return []
  }
}

async function searchMindexResearch(query: string, limit: number) {
  try {
    const res = await fetch(
      `${MINDEX_API_URL}/mindex/research/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// iNaturalist (SECONDARY / additive)
// ---------------------------------------------------------------------------

async function searchINaturalist(query: string, limit: number) {
  try {
    const data = await searchFungi(query)
    if (!data?.results) return []
    return data.results
      .filter(
        (r: any) =>
          (r.iconic_taxon_name === "Fungi" || r.ancestor_ids?.includes(47170)) &&
          (r.preferred_common_name || r.name)
      )
      .slice(0, limit)
      .map((r: any) => ({
        id: `inat-${r.id}`,
        scientificName: r.name || "",
        commonName: r.preferred_common_name || r.name || "",
        taxonomy: {
          kingdom: "Fungi",
          phylum: "",
          class: "",
          order: "",
          family: "",
          genus: "",
        },
        description: r.wikipedia_summary || `A species of fungus (${r.name})`,
        photos: r.default_photo
          ? [
              {
                id: String(r.default_photo.id || r.id),
                url: r.default_photo.square_url || "",
                medium_url: r.default_photo.medium_url || r.default_photo.square_url || "",
                large_url: r.default_photo.large_url || r.default_photo.medium_url || "",
                attribution: r.default_photo.attribution || "iNaturalist",
              },
            ]
          : [],
        observationCount: r.observations_count || 0,
        rank: r.rank || "species",
        _source: "iNaturalist",
      }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Research papers from OpenAlex (additive when MINDEX research is empty)
// ---------------------------------------------------------------------------

async function searchOpenAlexResearch(query: string, limit: number) {
  try {
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query + " fungi mushroom")}&per_page=${limit}&filter=topics.id:T10019`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).slice(0, limit).map((w: any) => ({
      id: w.id || `oalex-${Math.random().toString(36).slice(2)}`,
      title: w.title || "",
      authors: (w.authorships || []).slice(0, 5).map((a: any) => a.author?.display_name || "Unknown"),
      journal: w.primary_location?.source?.display_name || "",
      year: w.publication_year || 0,
      doi: (w.doi || "").replace("https://doi.org/", ""),
      abstract: w.abstract_inverted_index
        ? Object.keys(w.abstract_inverted_index).slice(0, 50).join(" ") + "..."
        : "",
      relatedSpecies: [],
      _source: "OpenAlex",
    }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// AI answer
// ---------------------------------------------------------------------------

async function getAIAnswer(query: string, origin: string) {
  try {
    const res = await fetch(`${origin}/api/search/ai?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return undefined
    const data = await res.json()
    if (!data?.result?.answer) return undefined
    return {
      text: data.result.answer,
      confidence: data.result.confidence || 0.8,
      sources: [data.result.source || "ai"],
    }
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateSpecies(primary: any[], secondary: any[]): any[] {
  const seen = new Set<string>()
  const results: any[] = []

  // MINDEX results first (primary)
  for (const item of primary) {
    const key = (item.scientificName || "").toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      results.push(item)
    }
  }

  // iNaturalist additions (secondary -- only if not already in MINDEX)
  for (const item of secondary) {
    const key = (item.scientificName || "").toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      results.push(item)
    }
  }

  return results
}

function ensureUniqueIds(arr: any[], prefix: string): any[] {
  const seen = new Set<string>()
  let counter = 0
  return arr
    .map((item) => {
      if (!item.id) item.id = `${prefix}-${item.scientificName || item.name || ++counter}`
      return item
    })
    .filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const startTime = performance.now()

  const { searchParams } = request.nextUrl
  const query = searchParams.get("q")?.trim()
  const typesStr = searchParams.get("types") || "species,compounds,genetics,research"
  const types = typesStr.split(",").map((t) => t.trim())
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
  const includeAI = searchParams.get("ai") === "true"

  if (!query || query.length < 2) {
    return NextResponse.json({
      query: query || "",
      results: { species: [], compounds: [], genetics: [], research: [] },
      totalCount: 0,
      timing: { total: 0, mindex: 0 },
      source: "live",
    })
  }

  try {
    const mindexStart = performance.now()

    // Run all queries in parallel
    const [
      mindexSpecies,
      mindexCompounds,
      mindexSequences,
      mindexResearch,
      inatSpecies,
      openAlexResearch,
      aiAnswer,
    ] = await Promise.all([
      types.includes("species") ? searchMindexSpecies(query, limit) : Promise.resolve([]),
      types.includes("compounds") ? searchMindexCompounds(query, limit) : Promise.resolve([]),
      types.includes("genetics") ? searchMindexSequences(query, limit) : Promise.resolve([]),
      types.includes("research") ? searchMindexResearch(query, limit) : Promise.resolve([]),
      types.includes("species") ? searchINaturalist(query, Math.min(limit, 10)) : Promise.resolve([]),
      types.includes("research") ? searchOpenAlexResearch(query, limit) : Promise.resolve([]),
      includeAI ? getAIAnswer(query, new URL(request.url).origin) : Promise.resolve(undefined),
    ])

    const mindexTime = performance.now() - mindexStart

    // Merge: MINDEX primary, iNaturalist secondary
    const species = ensureUniqueIds(
      deduplicateSpecies(mindexSpecies, inatSpecies),
      "sp"
    ).slice(0, limit)

    const compounds = ensureUniqueIds(mindexCompounds, "cmp").slice(0, limit)
    const genetics = ensureUniqueIds(mindexSequences, "gen").slice(0, limit)

    // Research: MINDEX first, OpenAlex additive
    const allResearch = [...mindexResearch, ...openAlexResearch]
    const research = ensureUniqueIds(allResearch, "res").slice(0, limit)

    const totalCount = species.length + compounds.length + genetics.length + research.length

    return NextResponse.json(
      {
        query,
        results: { species, compounds, genetics, research },
        totalCount,
        timing: {
          total: Math.round(performance.now() - startTime),
          mindex: Math.round(mindexTime),
        },
        source: "live",
        ...(aiAnswer ? { aiAnswer } : {}),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    )
  } catch (error) {
    console.error("Unified search error:", error)
    return NextResponse.json(
      {
        query,
        results: { species: [], compounds: [], genetics: [], research: [] },
        totalCount: 0,
        timing: { total: Math.round(performance.now() - startTime), mindex: 0 },
        source: "fallback",
        error: "Search service temporarily unavailable",
      },
      { status: 200 }
    )
  }
}
