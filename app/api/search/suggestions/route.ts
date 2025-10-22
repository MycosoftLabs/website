import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { SearchSuggestion } from "@/types/search"
import { comprehensiveSearch } from "@/lib/services/comprehensive-search"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const limit = Number(searchParams.get("limit")) || 10

    console.log("[v0] Suggestions API called with query:", query)

    try {
      const supabase = await createClient()

      if (!query.trim()) {
        const { data: featuredSpecies, error: featuredError } = await supabase
          .from("species")
          .select("id, scientific_name, common_names, inaturalist_id")
          .limit(5)

        if (!featuredError && featuredSpecies && featuredSpecies.length > 0) {
          const featuredSuggestions =
            featuredSpecies?.map(
              (species): SearchSuggestion => ({
                id: species.id,
                title: species.common_names?.[0] || species.scientific_name,
                type: "fungi",
                scientificName: species.scientific_name,
                url: `/species/${species.inaturalist_id || species.id}`,
              }),
            ) || []

          return NextResponse.json({ suggestions: featuredSuggestions })
        }
      } else {
        const { data: speciesResults, error: speciesError } = await supabase
          .from("species")
          .select("id, scientific_name, common_names, inaturalist_id")
          .or(
            `scientific_name.ilike.%${query}%,common_names.cs.{${query}},scientific_name.ilike.${query}%,common_names.cs.{${query.split(" ")[0]}}`,
          )
          .limit(8)

        if (!speciesError && speciesResults && speciesResults.length > 0) {
          const suggestions: SearchSuggestion[] =
            speciesResults?.map(
              (species): SearchSuggestion => ({
                id: species.id,
                title: species.common_names?.[0] || species.scientific_name,
                type: "fungi",
                scientificName: species.scientific_name,
                url: `/species/${species.inaturalist_id || species.id}`,
              }),
            ) || []

          const paperSuggestions: SearchSuggestion[] = []
          if (speciesResults && speciesResults.length > 0) {
            const speciesIds = speciesResults.slice(0, 3).map((s) => s.id)

            const { data: paperResults } = await supabase
              .from("species_papers")
              .select(
                `
                research_papers (
                  id,
                  title,
                  year
                ),
                species!inner (
                  common_names,
                  scientific_name
                )
              `,
              )
              .in("species_id", speciesIds)
              .limit(6)

            if (paperResults) {
              paperSuggestions.push(
                ...paperResults.map((result: any) => ({
                  id: result.research_papers.id,
                  title: result.research_papers.title,
                  type: "article" as const,
                  url: `/papers/${result.research_papers.id}`,
                  date: result.research_papers.year?.toString(),
                  description: `Related to ${result.species.common_names?.[0] || result.species.scientific_name}`,
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
    } catch (dbError) {
      console.log("[v0] Database not ready, using comprehensive search")
    }

    console.log("[v0] Using comprehensive search for suggestions")

    if (!query.trim()) {
      // Return featured species
      const featuredSpecies = [
        { id: "48250", name: "Agaricus bisporus", commonName: "Button Mushroom" },
        { id: "47348", name: "Pleurotus ostreatus", commonName: "Oyster Mushroom" },
        { id: "48715", name: "Lentinula edodes", commonName: "Shiitake" },
        { id: "54743", name: "Amanita muscaria", commonName: "Fly Agaric" },
        { id: "48701", name: "Ganoderma lucidum", commonName: "Reishi" },
        { id: "121657", name: "Hericium erinaceus", commonName: "Lion's Mane" },
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

    if (suggestions.length === 0) {
      return NextResponse.json({
        suggestions: [],
        query,
        message: "No results found. Try a different search term.",
      })
    }

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
