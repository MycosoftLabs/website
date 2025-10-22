import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    if (!query.trim()) {
      return NextResponse.json({
        species: [],
        relatedSpecies: [],
        papers: [],
        message: "No search query provided",
      })
    }

    const supabase = await createClient()

    const { data: speciesResults, error: speciesError } = await supabase
      .from("species")
      .select("id, scientific_name, common_names, description, inaturalist_id")
      .or(`scientific_name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(20)

    if (speciesError) {
      console.error("Species search error:", speciesError)
    }

    const matchedSpecies = (speciesResults || []).map((s) => ({
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
  } catch (error) {
    console.error("Species search error:", error)
    return NextResponse.json({
      species: [],
      relatedSpecies: [],
      papers: [],
      error: error instanceof Error ? error.message : "Search failed",
    })
  }
}
