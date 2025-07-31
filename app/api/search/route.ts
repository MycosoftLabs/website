import { NextResponse } from "next/server"
import { searchFungi } from "@/lib/services/inaturalist"
import { searchElsevierArticles } from "@/lib/services/elsevier"
import type { SearchResult } from "@/types/search"
import { SPECIES_MAPPING } from "@/lib/services/species-mapping"
import { searchCompounds } from "@/lib/data/compounds"
import { searchExpandedMushrooms } from "@/lib/data/top-mushrooms-expanded"
import { searchTracker } from "@/lib/services/search-tracker"

// Helper functions
function getLocalSearchResults(query: string) {
  try {
    return Object.values(SPECIES_MAPPING)
      .filter((species) => matchesSearch(species, query))
      .map(formatSpeciesResult)
  } catch (error) {
    console.error("Local search error:", error)
    return []
  }
}

function matchesSearch(species: any, query: string) {
  const normalizedQuery = query.toLowerCase()
  return (
    species.searchTerms?.some((term: string) => term.toLowerCase().includes(normalizedQuery)) ||
    species.commonNames.some((name: string) => name.toLowerCase().includes(normalizedQuery)) ||
    species.scientificName.toLowerCase().includes(normalizedQuery)
  )
}

function formatSpeciesResult(species: any) {
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
function formatExpandedMushroomResults(mushrooms: any[]) {
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
function formatCompoundResults(compounds: any[]) {
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

function formatFungiResults(fungiResults: any[]) {
  return fungiResults
    .filter((result: any) => {
      const isFungi = result.iconic_taxon_name === "Fungi" || result.ancestor_ids?.includes(47170)
      const hasValidName = result.preferred_common_name || result.name
      return isFungi && hasValidName
    })
    .map((result: any) => ({
      id: result.id.toString(),
      title: result.preferred_common_name || result.name,
      description: result.wikipedia_summary || `A species of fungus (${result.name})`,
      type: "fungi" as const,
      url: `/species/${result.id}`,
      source: "iNaturalist" as const,
    }))
}

function formatArticleResults(articleResults: any[]) {
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
export async function GET(request: Request) {
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
