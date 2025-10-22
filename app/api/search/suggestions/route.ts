import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { SearchSuggestion } from "@/types/search"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const limit = Number(searchParams.get("limit")) || 10

    const supabase = await createClient()

    if (!query.trim()) {
      const { data: featuredSpecies } = await supabase
        .from("species")
        .select("id, scientific_name, common_names, inaturalist_id")
        .limit(5)

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

    const { data: speciesResults } = await supabase
      .from("species")
      .select("id, scientific_name, common_names, inaturalist_id")
      .or(`scientific_name.ilike.%${query}%,common_names.cs.{${query}}`)
      .limit(8)

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

    const { data: directPaperResults } = await supabase
      .from("research_papers")
      .select("id, title, year")
      .ilike("title", `%${query}%`)
      .limit(4)

    if (directPaperResults) {
      paperSuggestions.push(
        ...directPaperResults.map((paper) => ({
          id: paper.id,
          title: paper.title,
          type: "article" as const,
          url: `/papers/${paper.id}`,
          date: paper.year?.toString(),
        })),
      )
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
