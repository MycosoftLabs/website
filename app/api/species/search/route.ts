import { NextResponse } from "next/server"
import { searchFungi } from "@/lib/services/inaturalist"
import { searchPapersBySpecies } from "@/lib/services/research-papers"
import { SPECIES_MAPPING } from "@/lib/services/species-mapping"

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

    // Search for matching species
    const [localSpecies, iNaturalistSpecies] = await Promise.allSettled([
      // Local species search
      Promise.resolve(
        Object.values(SPECIES_MAPPING).filter(
          (species) =>
            species.commonNames.some((name) => name.toLowerCase().includes(query.toLowerCase())) ||
            species.scientificName.toLowerCase().includes(query.toLowerCase()) ||
            species.searchTerms?.some((term) => term.toLowerCase().includes(query.toLowerCase())),
        ),
      ),
      // iNaturalist search
      searchFungi(query),
    ])

    const matchedSpecies: any[] = []
    const relatedSpecies: any[] = []

    // Process local results
    if (localSpecies.status === "fulfilled") {
      matchedSpecies.push(
        ...localSpecies.value.map((s) => ({
          id: s.iNaturalistId,
          scientificName: s.scientificName,
          commonName: s.commonNames[0],
          description: s.description,
          url: `/species/${s.iNaturalistId}`,
          source: "local",
        })),
      )
    }

    // Process iNaturalist results
    if (iNaturalistSpecies.status === "fulfilled" && iNaturalistSpecies.value?.results) {
      const inatResults = iNaturalistSpecies.value.results
        .filter((result: any) => result.iconic_taxon_name === "Fungi")
        .map((result: any) => ({
          id: result.id.toString(),
          scientificName: result.name,
          commonName: result.preferred_common_name || result.name,
          description: result.wikipedia_summary || "",
          url: `/species/${result.id}`,
          source: "inaturalist",
          rank: result.rank,
        }))

      matchedSpecies.push(...inatResults)
    }

    // Remove duplicates
    const uniqueSpecies = matchedSpecies.filter(
      (species, index, self) => index === self.findIndex((s) => s.id === species.id),
    )

    // Find related species (same genus or family)
    const mainSpeciesNames = uniqueSpecies.map((s) => s.scientificName.split(" ")[0])
    const allLocalSpecies = Object.values(SPECIES_MAPPING)

    for (const species of allLocalSpecies) {
      const genus = species.scientificName.split(" ")[0]
      if (mainSpeciesNames.includes(genus) && !uniqueSpecies.find((s) => s.id === species.iNaturalistId)) {
        relatedSpecies.push({
          id: species.iNaturalistId,
          scientificName: species.scientificName,
          commonName: species.commonNames[0],
          description: species.description,
          url: `/species/${species.iNaturalistId}`,
          relation: "Same genus",
        })
      }
    }

    // Search for papers related to all found species
    const papers: any[] = []
    for (const species of uniqueSpecies.slice(0, 5)) {
      try {
        const speciesPapers = await searchPapersBySpecies(species.scientificName, species.commonName)
        papers.push(
          ...speciesPapers.map((p) => ({
            ...p,
            relatedTo: species.commonName,
          })),
        )
      } catch (error) {
        console.error(`Error fetching papers for ${species.scientificName}:`, error)
      }
    }

    // Remove duplicate papers
    const uniquePapers = papers.filter((paper, index, self) => index === self.findIndex((p) => p.id === paper.id))

    return NextResponse.json({
      species: uniqueSpecies,
      relatedSpecies: relatedSpecies.slice(0, 10),
      papers: uniquePapers.slice(0, 20),
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
