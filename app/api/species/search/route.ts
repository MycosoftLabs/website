import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { searchSpecies } from "@/lib/services/inaturalist"
import { searchWikipedia } from "@/lib/services/wikipedia"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    console.log("[v0] Species search API called with query:", query)

    if (!query.trim()) {
      return NextResponse.json({
        species: [],
        relatedSpecies: [],
        papers: [],
        message: "No search query provided",
      })
    }

    try {
      const supabase = await createClient()

      const { data: speciesResults, error: speciesError } = await supabase
        .from("species")
        .select("id, scientific_name, common_names, description, inaturalist_id")
        .or(`scientific_name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20)

      // If no error and we have results, use Supabase data
      if (!speciesError && speciesResults && speciesResults.length > 0) {
        console.log("[v0] Using database results:", speciesResults.length)

        const matchedSpecies = speciesResults.map((s) => ({
          id: s.id,
          scientificName: s.scientific_name,
          commonName: s.common_names?.[0] || s.scientific_name,
          description: s.description,
          url: `/species/${s.inaturalist_id || s.id}`,
          source: "mycosoft",
        }))

        const relatedSpecies: any[] = []
        if (matchedSpecies.length > 0) {
          const mainGenus = matchedSpecies[0].scientificName.split(" ")[0]

          const { data: relatedResults } = await supabase
            .from("species")
            .select("id, scientific_name, common_names, description, inaturalist_id")
            .ilike("scientific_name", `${mainGenus}%`)
            .not("id", "in", `(${matchedSpecies.map((s) => s.id).join(",")})`)
            .limit(10)

          if (relatedResults) {
            relatedSpecies.push(
              ...relatedResults.map((s) => ({
                id: s.id,
                scientificName: s.scientific_name,
                commonName: s.common_names?.[0] || s.scientific_name,
                description: s.description,
                url: `/species/${s.inaturalist_id || s.id}`,
                relation: "Same genus",
              })),
            )
          }
        }

        const papers: any[] = []
        if (matchedSpecies.length > 0) {
          const speciesIds = matchedSpecies.map((s) => s.id)

          const { data: paperResults } = await supabase
            .from("species_papers")
            .select(`
              research_papers (
                id,
                title,
                authors,
                abstract,
                year,
                journal,
                doi
              ),
              species!inner (
                id,
                scientific_name,
                common_names
              )
            `)
            .in("species_id", speciesIds)
            .limit(20)

          if (paperResults) {
            papers.push(
              ...paperResults.map((result: any) => ({
                id: result.research_papers.id,
                title: result.research_papers.title,
                authors: result.research_papers.authors,
                abstract: result.research_papers.abstract,
                year: result.research_papers.year,
                journal: result.research_papers.journal,
                doi: result.research_papers.doi,
                url: `/papers/${result.research_papers.id}`,
                relatedTo: result.species.common_names?.[0] || result.species.scientific_name,
              })),
            )
          }
        }

        return NextResponse.json({
          species: matchedSpecies,
          relatedSpecies,
          papers,
          query,
        })
      }
    } catch (dbError) {
      console.log("[v0] Database not ready, using external APIs:", dbError)
    }

    console.log("[v0] Using external APIs for search:", query)

    const [iNatResults, wikiResults] = await Promise.all([
      searchSpecies(query).catch((err) => {
        console.error("[v0] iNaturalist search error:", err)
        return []
      }),
      searchWikipedia(query).catch((err) => {
        console.error("[v0] Wikipedia search error:", err)
        return []
      }),
    ])

    const species = iNatResults.slice(0, 10).map((result: any) => ({
      id: result.id.toString(),
      scientificName: result.name,
      commonName: result.preferred_common_name || result.name,
      description: result.wikipedia_summary || "",
      url: `/species/${result.id}`,
      source: "inaturalist",
    }))

    const relatedSpecies: any[] = []
    if (species.length > 0) {
      const mainGenus = species[0].scientificName.split(" ")[0]
      const related = iNatResults
        .filter((r: any) => r.name.startsWith(mainGenus) && r.id.toString() !== species[0].id)
        .slice(0, 5)
        .map((result: any) => ({
          id: result.id.toString(),
          scientificName: result.name,
          commonName: result.preferred_common_name || result.name,
          description: result.wikipedia_summary || "",
          url: `/species/${result.id}`,
          relation: "Same genus",
        }))
      relatedSpecies.push(...related)
    }

    const papers = wikiResults
      .filter((result: any) => result.type === "article")
      .slice(0, 10)
      .map((result: any, index: number) => ({
        id: `wiki-${index}`,
        title: result.title,
        authors: ["Wikipedia Contributors"],
        abstract: result.extract || "",
        year: new Date().getFullYear(),
        journal: "Wikipedia",
        doi: "",
        url: `/papers/wiki-${encodeURIComponent(result.title)}`,
        relatedTo: query,
      }))

    return NextResponse.json({
      species,
      relatedSpecies,
      papers,
      query,
    })
  } catch (error) {
    console.error("[v0] Species search error:", error)
    return NextResponse.json(
      {
        species: [],
        relatedSpecies: [],
        papers: [],
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 200 }, // Return 200 with error in body instead of 500
    )
  }
}
