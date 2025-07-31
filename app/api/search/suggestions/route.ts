import { NextResponse } from "next/server"
import { searchFungi } from "@/lib/services/inaturalist"
import { searchElsevierArticles } from "@/lib/services/elsevier"
import { SPECIES_MAPPING } from "@/lib/services/species-mapping"
import { searchCompounds } from "@/lib/data/compounds"
import type { SearchSuggestion } from "@/types/search"

// Update the GET function to include compound search
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const limit = Number(searchParams.get("limit")) || 10

    if (!query.trim()) {
      // Return popular/featured items when no query
      const featuredSuggestions = Object.values(SPECIES_MAPPING)
        .slice(0, 5)
        .map(
          (species): SearchSuggestion => ({
            id: species.iNaturalistId,
            title: species.commonNames[0],
            type: "fungi",
            scientificName: species.scientificName,
            url: `/species/${species.iNaturalistId}`,
          }),
        )

      return NextResponse.json({ suggestions: featuredSuggestions })
    }

    // Search in parallel from multiple sources
    const [localResults, iNaturalistResults, elsevierResults, compoundResults] = await Promise.allSettled([
      // Local species search
      Promise.resolve(
        Object.values(SPECIES_MAPPING)
          .filter(
            (species) =>
              species.commonNames.some((name) => name.toLowerCase().includes(query.toLowerCase())) ||
              species.scientificName.toLowerCase().includes(query.toLowerCase()) ||
              species.searchTerms?.some((term) => term.toLowerCase().includes(query.toLowerCase())),
          )
          .map(
            (species): SearchSuggestion => ({
              id: species.iNaturalistId,
              title: species.commonNames[0],
              type: "fungi",
              scientificName: species.scientificName,
              url: `/species/${species.iNaturalistId}`,
            }),
          ),
      ),
      // iNaturalist search - now returns empty results on error instead of throwing
      searchFungi(query),
      // Elsevier articles search
      searchElsevierArticles(query).catch(() => []), // Return empty array on error
      // Compound search
      Promise.resolve(
        searchCompounds(query).map(
          (compound): SearchSuggestion => ({
            id: compound.id,
            title: compound.name,
            type: "compound",
            description: `${compound.chemicalClass} - ${compound.description}`,
            url: `/compounds/${compound.id}`,
          }),
        ),
      ),
    ])

    const suggestions: SearchSuggestion[] = []

    // Add local results first - these should always be available
    if (localResults.status === "fulfilled") {
      suggestions.push(...localResults.value)
    }

    // Add iNaturalist results if available
    if (iNaturalistResults.status === "fulfilled" && iNaturalistResults.value?.results) {
      suggestions.push(
        ...iNaturalistResults.value.results
          .filter((result: any) => result.iconic_taxon_name === "Fungi")
          .map(
            (result: any): SearchSuggestion => ({
              id: result.id.toString(),
              title: result.preferred_common_name || result.name,
              type: "fungi",
              scientificName: result.name,
              url: `/species/${result.id}`,
            }),
          ),
      )
    }

    // Add article results if available
    if (elsevierResults.status === "fulfilled") {
      suggestions.push(
        ...elsevierResults.value.map(
          (article: any): SearchSuggestion => ({
            id: article.doi,
            title: article.title,
            type: "article",
            url: `/papers/${encodeURIComponent(article.doi)}`,
            date: new Date(article.publicationDate).getFullYear().toString(),
          }),
        ),
      )
    }

    // Add compound results if available
    if (compoundResults.status === "fulfilled") {
      suggestions.push(...compoundResults.value)
    }

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.filter(
      (suggestion, index, self) => index === self.findIndex((s) => s.id === suggestion.id),
    )

    // If we have no results at all, provide a helpful message
    if (uniqueSuggestions.length === 0) {
      return NextResponse.json({
        suggestions: [],
        query,
        message: "No results found. Try a different search term.",
      })
    }

    return NextResponse.json({
      suggestions: uniqueSuggestions.slice(0, limit),
      query,
    })
  } catch (error) {
    console.error("Search suggestions error:", error)
    // Return a minimal response with no suggestions but no error status
    // This prevents the UI from breaking when search fails
    return NextResponse.json({
      suggestions: [],
      error: error instanceof Error ? error.message : "Failed to get suggestions",
    })
  }
}
