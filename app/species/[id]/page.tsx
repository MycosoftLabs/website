import { notFound } from "next/navigation"
import { SpeciesTemplate } from "@/components/templates/species-template"
import { SPECIES_MAPPING } from "@/lib/services/species-mapping"
import { getFungiDetails } from "@/lib/services/inaturalist"

interface SpeciesPageProps {
  params: {
    id: string
  }
}

export default async function SpeciesPage({ params }: SpeciesPageProps) {
  try {
    if (!params.id) {
      console.error("No species ID provided")
      return notFound()
    }

    // First check our known species mapping
    const knownSpecies = Object.values(SPECIES_MAPPING).find((species) => species.iNaturalistId === params.id)

    let speciesData
    if (knownSpecies) {
      console.log("Found species in mapping:", knownSpecies.scientificName)
      // Get iNaturalist data for the known species
      try {
        speciesData = await getFungiDetails(params.id)
        // Merge with our known data
        speciesData = {
          ...speciesData,
          description: knownSpecies.description || speciesData.description,
          characteristics: knownSpecies.characteristics,
          compounds: knownSpecies.compounds,
          // Keep iNaturalist images but add our defaults as fallback
          images: [
            ...speciesData.images,
            ...(knownSpecies.defaultImages || []).map((img) => ({
              ...img,
              taxon_id: params.id,
              source: "mycosoft" as const,
            })),
          ],
        }
      } catch (error) {
        console.error("Error fetching iNaturalist data, falling back to known species data:", error)
        speciesData = {
          id: params.id,
          commonName: knownSpecies.commonNames[0],
          scientificName: knownSpecies.scientificName,
          description: knownSpecies.description || "",
          taxonomy: knownSpecies.taxonomy,
          characteristics: knownSpecies.characteristics,
          compounds: knownSpecies.compounds,
          images: (knownSpecies.defaultImages || []).map((img) => ({
            ...img,
            taxon_id: params.id,
            source: "mycosoft" as const,
          })),
          references: [
            {
              title: "View on iNaturalist",
              url: `https://www.inaturalist.org/taxa/${params.id}`,
              type: "database" as const,
            },
          ],
          lastUpdated: new Date().toISOString(),
          iNaturalistId: params.id,
        }
      }
    } else {
      // If not in our mapping, get data from iNaturalist API
      console.log("Fetching from iNaturalist API...")
      speciesData = await getFungiDetails(params.id)

      if (!speciesData) {
        console.error("No data found for species ID:", params.id)
        return notFound()
      }
    }

    return <SpeciesTemplate species={speciesData} />
  } catch (error) {
    if (error instanceof Error && error.message.includes("Species not found")) {
      return notFound()
    }
    console.error("Error loading species:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to load species")
  }
}
