import { NextResponse } from "next/server"
import { mindexClient } from "@/lib/services/mindex-client"
import type { SearchSuggestion } from "@/types/search"
import { comprehensiveSearch } from "@/lib/services/comprehensive-search"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const limit = Number(searchParams.get("limit")) || 10

    console.log("[v0] Suggestions API called with query:", query)

    try {
      await mindexClient.connect()

      if (mindexClient.isConnected()) {
        console.log("[v0] Using MINDEX for suggestions")

        if (!query.trim()) {
          // Return featured species from MINDEX
          const featuredSpecies = await mindexClient
            .getCollection("species")
            ?.find({ featured: true })
            .limit(6)
            .toArray()

          if (featuredSpecies && featuredSpecies.length > 0) {
            const suggestions: SearchSuggestion[] = featuredSpecies.map((species: any) => ({
              id: species.inaturalistId || species.id,
              title: species.commonNames?.[0] || species.scientificName,
              type: "fungi",
              scientificName: species.scientificName,
              url: `/species/${species.inaturalistId || species.id}`,
              image: species.images?.[0]?.url,
            }))

            return NextResponse.json({ suggestions })
          }
        } else {
          // Search MINDEX for species
          const speciesResults = await mindexClient.searchSpecies(query, 8)

          if (speciesResults && speciesResults.length > 0) {
            const suggestions: SearchSuggestion[] = speciesResults.map((species: any) => ({
              id: species.inaturalistId || species.id,
              title: species.commonNames?.[0] || species.scientificName,
              type: "fungi",
              scientificName: species.scientificName,
              url: `/species/${species.inaturalistId || species.id}`,
              image: species.images?.[0]?.url,
            }))

            // Add related papers from MINDEX
            const paperSuggestions: SearchSuggestion[] = []
            for (const species of speciesResults.slice(0, 3)) {
              const papers = await mindexClient.searchPapers(query, species.id, 2)

              if (papers && papers.length > 0) {
                paperSuggestions.push(
                  ...papers.map((paper: any) => ({
                    id: paper.id,
                    title: paper.title,
                    type: "article" as const,
                    url: `/papers/${paper.id}`,
                    date: paper.year?.toString(),
                    description: `Related to ${species.commonNames?.[0] || species.scientificName}`,
                  })),
                )
              }
            }

            suggestions.push(...paperSuggestions)

            const uniqueSuggestions = suggestions.filter(
              (suggestion, index, self) => index === self.findIndex((s) => s.id === suggestion.id),
            )

            return NextResponse.json({
              suggestions: uniqueSuggestions.slice(0, limit),
              query,
            })
          }
        }
      }
    } catch (mindexError) {
      console.log("[v0] MINDEX not available, using fallback:", mindexError)
    }
    // </CHANGE>

    console.log("[v0] Using comprehensive search for suggestions")

    if (!query.trim()) {
      const featuredSpecies = [
        { id: "48250", name: "Agaricus bisporus", commonName: "Button Mushroom" },
        { id: "47348", name: "Pleurotus ostreatus", commonName: "Oyster Mushroom" },
        { id: "48715", name: "Lentinula edodes", commonName: "Shiitake" },
        { id: "121657", name: "Hericium erinaceus", commonName: "Lion's Mane" },
        { id: "48701", name: "Ganoderma lucidum", commonName: "Reishi" },
        { id: "54743", name: "Amanita muscaria", commonName: "Fly Agaric" },
      ]

      const suggestions: SearchSuggestion[] = featuredSpecies.map((species) => ({
        id: species.id,
        title: species.commonName,
        type: "fungi",
        scientificName: species.name,
        url: `/species/${species.id}`,
      }))

      return NextResponse.json({ suggestions })
    }

    const searchResults = await comprehensiveSearch(query, limit)

    const suggestions: SearchSuggestion[] = searchResults.map((result) => ({
      id: result.id,
      title: result.commonName,
      type: "fungi" as const,
      scientificName: result.scientificName,
      url: `/species/${result.id}`,
      description: result.description,
    }))
    // </CHANGE>

    return NextResponse.json({
      suggestions,
      query,
    })
  } catch (error) {
    console.error("[v0] Search suggestions error:", error)
    return NextResponse.json(
      {
        suggestions: [],
        error: error instanceof Error ? error.message : "Failed to get suggestions",
      },
      { status: 200 },
    )
  }
}
