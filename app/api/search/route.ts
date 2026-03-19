import { NextRequest, NextResponse } from "next/server"
import { searchFungi } from "@/lib/services/inaturalist"
import { searchElsevierArticles } from "@/lib/services/elsevier"
import type { SearchResult } from "@/types/search"
import { SPECIES_MAPPING } from "@/lib/services/species-mapping"
import { searchCompounds } from "@/lib/data/compounds"
import { searchExpandedMushrooms } from "@/lib/data/top-mushrooms-expanded"
import { searchTracker } from "@/lib/services/search-tracker"
import { recordUsageFromRequest } from "@/lib/usage/record-api-usage"

const MINDEX_BASE = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"
const USE_WORLDVIEW_SEARCH = process.env.USE_WORLDVIEW_SEARCH === "true"

interface SpeciesMappingEntry {
  iNaturalistId?: string | number
  scientificName: string
  commonNames: string[]
  searchTerms?: string[]
  description?: string
}

interface ExpandedMushroom {
  iNaturalistId?: string | number
  scientificName: string
  commonNames: string[]
  description?: string
  category?: string
  popularity?: number
  regions?: string[]
}

interface CompoundEntry {
  id: string
  name: string
  chemicalClass?: string
  description?: string
  formula?: string
  molecularWeight?: number
  sourceSpecies?: string[]
  biologicalActivity?: string[]
}

interface INaturalistResult {
  id: number
  name: string
  preferred_common_name?: string
  iconic_taxon_name?: string
  ancestor_ids?: number[]
  wikipedia_summary?: string
}

interface ElsevierArticle {
  doi: string
  title: string
  abstract?: string
  authors: Array<{ name: string }>
  publicationDate: string
  journal: { name: string }
}

// Helper functions
function getLocalSearchResults(query: string) {
  try {
    return Object.values(SPECIES_MAPPING)
      .filter((species) => matchesSearch(species as SpeciesMappingEntry, query))
      .map((species) => formatSpeciesResult(species as SpeciesMappingEntry))
  } catch (error) {
    console.error("Local search error:", error)
    return []
  }
}

function matchesSearch(species: SpeciesMappingEntry, query: string) {
  const normalizedQuery = query.toLowerCase()
  return (
    species.searchTerms?.some((term: string) => term.toLowerCase().includes(normalizedQuery)) ||
    species.commonNames.some((name: string) => name.toLowerCase().includes(normalizedQuery)) ||
    species.scientificName.toLowerCase().includes(normalizedQuery)
  )
}

function formatSpeciesResult(species: SpeciesMappingEntry) {
  return {
    id: species.iNaturalistId,
    title: species.commonNames[0],
    description: species.description || "",
    type: "fungi",
    url: `/species/${species.iNaturalistId}`,
    source: "iNaturalist",
  }
}

// Add function to format expanded mushroom results
function formatExpandedMushroomResults(mushrooms: ExpandedMushroom[]) {
  return mushrooms.map((mushroom) => ({
    id: mushroom.iNaturalistId || `expanded-${mushroom.scientificName.toLowerCase().replace(/\s+/g, "-")}`,
    title: mushroom.commonNames[0],
    description: mushroom.description || `${mushroom.scientificName} - ${mushroom.category} mushroom`,
    type: "fungi" as const,
    url: mushroom.iNaturalistId
      ? `/species/${mushroom.iNaturalistId}`
      : `/mushrooms/${mushroom.scientificName.toLowerCase().replace(/\s+/g, "-")}`,
    source: "Mycosoft" as const,
    metadata: {
      scientificName: mushroom.scientificName,
      category: mushroom.category,
      popularity: mushroom.popularity,
      regions: mushroom.regions,
    },
  }))
}

// Add function to format compound results
function formatCompoundResults(compounds: CompoundEntry[]) {
  return compounds.map((compound) => ({
    id: compound.id,
    title: compound.name,
    description: `${compound.chemicalClass}: ${compound.description}`,
    type: "compound" as const,
    url: `/compounds/${compound.id}`,
    source: "ChemSpider" as const,
    metadata: {
      formula: compound.formula,
      molecularWeight: compound.molecularWeight,
      sourceSpecies: compound.sourceSpecies,
      biologicalActivity: compound.biologicalActivity,
    },
  }))
}

function formatFungiResults(fungiResults: INaturalistResult[]) {
  return fungiResults
    .filter((result) => {
      const isFungi = result.iconic_taxon_name === "Fungi" || result.ancestor_ids?.includes(47170)
      const hasValidName = result.preferred_common_name || result.name
      return isFungi && hasValidName
    })
    .map((result) => ({
      id: result.id.toString(),
      title: result.preferred_common_name || result.name,
      description: result.wikipedia_summary || `A species of fungus (${result.name})`,
      type: "fungi" as const,
      url: `/species/${result.id}`,
      source: "iNaturalist" as const,
    }))
}

function formatArticleResults(articleResults: ElsevierArticle[]) {
  return articleResults.map((article) => ({
    id: article.doi,
    title: article.title,
    description: article.abstract || "No abstract available.",
    type: "paper" as const,
    url: `/papers/${encodeURIComponent(article.doi)}`,
    source: "Elsevier" as const,
    metadata: {
      authors: article.authors.map((author) => author.name),
      year: new Date(article.publicationDate).getFullYear(),
      journal: article.journal.name,
      doi: article.doi,
    },
  }))
}

// Add better error handling and fallbacks
export async function GET(request: NextRequest) {
  const headers = {
    "Content-Type": "application/json",
  }

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query?.trim()) {
      return NextResponse.json({ results: [], message: "No search query provided" }, { status: 200, headers })
    }

    // Track this search query
    searchTracker.trackSearch(query)

    // Worldview-first: try MINDEX /api/worldview/v1/search when enabled.
    // Uses per-user API key forwarding for rate limiting.
    if (USE_WORLDVIEW_SEARCH) {
      try {
        const authHeader = request.headers.get("authorization") || ""
        const wvHeaders: Record<string, string> = { "Content-Type": "application/json" }
        if (authHeader) wvHeaders["Authorization"] = authHeader
        const mindexApiKey = process.env.MINDEX_API_KEY
        if (mindexApiKey) wvHeaders["X-API-Key"] = mindexApiKey

        const wvRes = await fetch(
          `${MINDEX_BASE}/api/worldview/v1/search?q=${encodeURIComponent(query)}&limit=20`,
          { headers: wvHeaders, signal: AbortSignal.timeout(5000), cache: "no-store" }
        )
        if (wvRes.ok) {
          const wvData = await wvRes.json()
          const wvResults: SearchResult[] = (wvData.results || []).map(
            (r: { id?: string; title?: string; description?: string; type?: string; url?: string; source?: string }) => ({
              id: r.id || "",
              title: r.title || "",
              description: r.description || "",
              type: r.type || "fungi",
              url: r.url || "",
              source: r.source || "Worldview",
            })
          )
          if (wvResults.length > 0) {
            await recordUsageFromRequest({
              request,
              usageType: "SPECIES_IDENTIFICATION",
              quantity: 1,
              metadata: { query, source: "worldview_v1" },
            })
            return NextResponse.json({ results: wvResults, query, source: "worldview" }, { status: 200, headers })
          }
        }
      } catch {
        // Worldview not available — fall through to legacy search
      }
    }

    // Initialize with local results first
    const results: SearchResult[] = await getLocalSearchResults(query)

    // Add expanded mushroom results
    const expandedResults = formatExpandedMushroomResults(searchExpandedMushrooms(query))
    results.push(...expandedResults)

    // Try external APIs in parallel with timeouts
    const [iNaturalistResults, elsevierResults, compoundResults] = await Promise.allSettled([
      searchFungi(query).catch(() => ({ results: [] })),
      searchElsevierArticles(query).catch(() => []),
      Promise.resolve(searchCompounds(query)),
    ])

    // Add successful results
    if (iNaturalistResults.status === "fulfilled" && iNaturalistResults.value?.results) {
      results.push(...formatFungiResults(iNaturalistResults.value.results))
    }

    if (elsevierResults.status === "fulfilled") {
      results.push(...formatArticleResults(elsevierResults.value))
    }

    // Add compound results
    if (compoundResults.status === "fulfilled") {
      results.push(...formatCompoundResults(compoundResults.value))
    }

    // Remove duplicates by ID
    const uniqueResults = results.filter((result, index, self) => index === self.findIndex((r) => r.id === result.id))

    // AI fallback when local + external sources return nothing
    if (uniqueResults.length === 0) {
      try {
        const aiRes = await fetch(`${new URL(request.url).origin}/api/search/ai?q=${encodeURIComponent(query)}`, {
          signal: AbortSignal.timeout(12000),
        }).catch(() => null)
        if (aiRes?.ok) {
          const ai = await aiRes.json()
          await recordUsageFromRequest({
            request,
            usageType: "SPECIES_IDENTIFICATION",
            quantity: 1,
            metadata: { query },
          })

          return NextResponse.json(
            {
              results: [],
              query,
              ai: ai?.result ?? null,
            },
            { status: 200, headers },
          )
        }
      } catch {
        // ignore
      }
    }

    await recordUsageFromRequest({
      request,
      usageType: "SPECIES_IDENTIFICATION",
      quantity: 1,
      metadata: { query },
    })

    return NextResponse.json({ results: uniqueResults, query }, { status: 200, headers })
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json(
      {
        results: [],
        error: "Search service temporarily unavailable",
        query: "",
      },
      { status: 200, headers },
    )
  }
}
