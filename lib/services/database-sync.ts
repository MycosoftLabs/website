import { createClient } from "@/lib/supabase/server"
import { getFungiDetails } from "./inaturalist"
import { getWikipediaData } from "./wikipedia"
import { searchPapersBySpecies } from "./research-papers"

export interface SpeciesData {
  inaturalistId: string
  scientificName: string
  commonNames: string[]
  description: string
  taxonomy: any
  habitat?: string
  distribution?: string
  edibility?: string
  toxicity?: string
  images: any[]
  sources: any
}

/**
 * Sync species data from external sources to our database
 */
export async function syncSpeciesToDatabase(inaturalistId: string): Promise<string | null> {
  try {
    const supabase = await createClient()

    // Check if species already exists
    const { data: existing } = await supabase.from("species").select("id").eq("inaturalist_id", inaturalistId).single()

    if (existing) {
      return existing.id
    }

    // Fetch data from iNaturalist
    const iNatData = await getFungiDetails(inaturalistId)

    // Fetch additional data from Wikipedia
    let wikiData = null
    try {
      wikiData = await getWikipediaData(iNatData.scientificName)
    } catch (error) {
      console.warn("Wikipedia fetch failed:", error)
    }

    // Insert species into database
    const { data: species, error: speciesError } = await supabase
      .from("species")
      .insert({
        inaturalist_id: inaturalistId,
        scientific_name: iNatData.scientificName,
        common_names: iNatData.commonName ? [iNatData.commonName] : [],
        description: iNatData.description || wikiData?.extract || "",
        taxonomy: iNatData.taxonomy,
        habitat: wikiData?.habitat,
        distribution: wikiData?.distribution,
        edibility: wikiData?.edibility,
        sources: {
          inaturalist: iNatData,
          wikipedia: wikiData,
        },
      })
      .select()
      .single()

    if (speciesError) {
      console.error("Error inserting species:", speciesError)
      return null
    }

    // Insert images
    if (iNatData.images && iNatData.images.length > 0) {
      const images = iNatData.images.map((img: any, index: number) => ({
        species_id: species.id,
        url: img.url,
        thumbnail_url: img.thumbnail,
        attribution: img.attribution,
        license: img.license_code,
        source: "inaturalist",
        is_primary: index === 0,
      }))

      await supabase.from("species_images").insert(images)
    }

    // Fetch and store research papers
    try {
      const papers = await searchPapersBySpecies(iNatData.scientificName, iNatData.commonName)

      for (const paper of papers.slice(0, 10)) {
        // Limit to 10 papers per species
        // Insert paper
        const { data: insertedPaper, error: paperError } = await supabase
          .from("research_papers")
          .upsert(
            {
              title: paper.title,
              authors: paper.authors,
              abstract: paper.abstract,
              year: paper.year,
              journal: paper.journal,
              doi: paper.doi,
              external_url: paper.url,
              source: paper.source,
              keywords: paper.keywords,
            },
            {
              onConflict: "doi",
              ignoreDuplicates: false,
            },
          )
          .select()
          .single()

        if (!paperError && insertedPaper) {
          // Link paper to species
          await supabase.from("species_papers").upsert(
            {
              species_id: species.id,
              paper_id: insertedPaper.id,
              relevance_score: 1.0,
            },
            {
              onConflict: "species_id,paper_id",
              ignoreDuplicates: true,
            },
          )
        }
      }
    } catch (error) {
      console.warn("Error syncing papers:", error)
    }

    return species.id
  } catch (error) {
    console.error("Error syncing species to database:", error)
    return null
  }
}

/**
 * Get species from database with all related data
 */
export async function getSpeciesFromDatabase(scientificName: string) {
  const supabase = await createClient()

  const { data: species, error } = await supabase
    .from("species")
    .select(`
      *,
      species_images(*),
      species_papers(
        relevance_score,
        research_papers(*)
      )
    `)
    .eq("scientific_name", scientificName)
    .single()

  if (error) {
    console.error("Error fetching species:", error)
    return null
  }

  return species
}

/**
 * Search species in database
 */
export async function searchSpeciesInDatabase(query: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("species")
    .select("id, scientific_name, common_names, description")
    .or(`scientific_name.ilike.%${query}%,common_names.cs.{${query}}`)
    .limit(20)

  if (error) {
    console.error("Error searching species:", error)
    return []
  }

  return data
}
