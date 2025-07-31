import { notFound } from "next/navigation"
import { getCompoundDetails } from "@/lib/services/chemical-data"
import { CompoundTemplate } from "@/components/templates/compound-template"
import { SPECIES_MAPPING } from "@/lib/services/species-mapping"

interface CompoundPageProps {
  params: {
    id: string
  }
}

export default async function CompoundPage({ params }: CompoundPageProps) {
  try {
    // First check if this compound is associated with any known species
    const associatedSpecies = Object.values(SPECIES_MAPPING).filter((species) =>
      species.compounds?.some((compound) => compound.id === params.id),
    )

    const compound = await getCompoundDetails(params.id)

    // Enrich compound data with species relationships
    if (compound && associatedSpecies.length > 0) {
      compound.foundIn = associatedSpecies.map((species) => ({
        id: species.iNaturalistId,
        scientificName: species.scientificName,
        commonName: species.commonNames[0],
      }))
    }

    if (!compound) {
      console.error(`Compound not found: ${params.id}`)
      notFound()
    }

    return <CompoundTemplate compound={compound} />
  } catch (error) {
    console.error("Error fetching compound:", error)
    notFound()
  }
}
