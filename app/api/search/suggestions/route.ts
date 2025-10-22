import { NextResponse } from "next/server"
import { searchFungi } from "@/lib/services/inaturalist"
import { searchElsevierArticles } from "@/lib/services/elsevier"
import { searchPapersBySpecies } from "@/lib/services/research-papers"
import { SPECIES_MAPPING } from "@/lib/services/species-mapping"
import { searchCompounds } from "@/lib/data/compounds"
import type { SearchSuggestion } from "@/types/search"

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
      // iNaturalist search
      searchFungi(query),
      // Elsevier articles search
      searchElsevierArticles(query).catch(() => []),
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
    const speciesForPaperSearch: Array<{ scientificName: string; commonName: string }> = []

    // Add local results first
    if (localResults.status === "fulfilled") {
      suggestions.push(...localResults.value)
      localResults.value.forEach((s) => {
        if (s.scientificName) {
          speciesForPaperSearch.push({
            scientificName: s.scientificName,
            commonName: s.title,
          })
        }
      })
    }

    // Add iNaturalist results
    if (iNaturalistResults.status === "fulfilled" && iNaturalistResults.value?.results) {
      const inatSuggestions = iNaturalistResults.value.results
        .filter((result: any) => result.iconic_taxon_name === "Fungi")
        .map(
          (result: any): SearchSuggestion => ({
            id: result.id.toString(),
            title: result.preferred_common_name || result.name,
            type: "fungi",
            scientificName: result.name,
            url: `/species/${result.id}`,
          }),
        )

      suggestions.push(...inatSuggestions)

      inatSuggestions.forEach((s) => {
        if (s.scientificName) {
          speciesForPaperSearch.push({
            scientificName: s.scientificName,
            commonName: s.title,
          })
        }
      })
    }

    const paperSuggestions: SearchSuggestion[] = []
    if (speciesForPaperSearch.length > 0) {
      // Take top 3 species to search papers for
      const topSpecies = speciesForPaperSearch.slice(0, 3)

      for (const species of topSpecies) {
        try {
          const papers = await searchPapersBySpecies(species.scientificName, species.commonName)
          paperSuggestions.push(
            ...papers.slice(0, 2).map((paper) => ({
              id: paper.id,
              title: paper.title,
              type: "article" as const,
              url: `/papers/${encodeURIComponent(paper.doi || paper.id)}`,
              date: paper.year.toString(),
              description: `Related to ${species.commonName}`,
            })),
          )
        } catch (error) {
          console.error(`Error fetching papers for ${species.scientificName}:`, error)
        }
      }
    }

    // Add article results from direct search
    if (elsevierResults.status === "fulfilled") {
      paperSuggestions.push(
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

    // Add compound results
    if (compoundResults.status === "fulfilled") {
      suggestions.push(...compoundResults.value)
    }

    suggestions.push(...paperSuggestions)

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.filter(
      (suggestion, index, self) => index === self.findIndex((s) => s.id === suggestion.id),
    )

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
    return NextResponse.json({
      suggestions: [],
      error: error instanceof Error ? error.message : "Failed to get suggestions",
    })
  }
}
