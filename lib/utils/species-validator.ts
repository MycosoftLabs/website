import { SPECIES_MAPPING } from "@/lib/services/species-mapping"

interface ValidationResult {
  species: string
  currentId: string
  correctId: string
  status: "valid" | "invalid" | "error"
  error?: string
}

const KNOWN_CORRECT_IDS = {
  "Trametes versicolor": "54134", // Turkey Tail
  "Hericium erinaceus": "49158", // Lion's Mane
  "Ganoderma lucidum": "48139", // Reishi
  "Cordyceps militaris": "57833", // Cordyceps
  "Inonotus obliquus": "50443", // Chaga
  "Pleurotus ostreatus": "48701", // Oyster
  "Lentinula edodes": "48564", // Shiitake
  "Agaricus bisporus": "54649", // Button
  "Morchella esculenta": "48701", // Morel
  "Flammulina velutipes": "55409", // Enoki
}

async function validateSpeciesId(scientificName: string, currentId: string): Promise<ValidationResult> {
  try {
    // First check against known correct IDs
    const knownId = KNOWN_CORRECT_IDS[scientificName as keyof typeof KNOWN_CORRECT_IDS]
    if (knownId) {
      return {
        species: scientificName,
        currentId,
        correctId: knownId,
        status: currentId === knownId ? "valid" : "invalid",
      }
    }

    // If not in known IDs, verify with iNaturalist API
    const response = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species`,
    )

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status}`)
    }

    const data = await response.json()
    const exactMatch = data.results.find(
      (result: any) =>
        result.name.toLowerCase() === scientificName.toLowerCase() ||
        result.matched_term?.toLowerCase() === scientificName.toLowerCase(),
    )

    if (!exactMatch) {
      return {
        species: scientificName,
        currentId,
        correctId: "",
        status: "error",
        error: "Species not found in iNaturalist",
      }
    }

    return {
      species: scientificName,
      currentId,
      correctId: exactMatch.id.toString(),
      status: currentId === exactMatch.id.toString() ? "valid" : "invalid",
    }
  } catch (error) {
    return {
      species: scientificName,
      currentId,
      correctId: "",
      status: "error",
      error: error instanceof Error ? error.message : "Validation failed",
    }
  }
}

export async function validateAllSpecies(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []

  for (const [key, species] of Object.entries(SPECIES_MAPPING)) {
    const result = await validateSpeciesId(species.scientificName, species.iNaturalistId)
    results.push(result)
  }

  return results
}

export function generateSpeciesMappingUpdate(validationResults: ValidationResult[]): string {
  let updatedMapping = "export const SPECIES_MAPPING = {\n"

  for (const result of validationResults) {
    if (result.status === "invalid" && result.correctId) {
      const species = Object.values(SPECIES_MAPPING).find((s) => s.scientificName === result.species)
      if (species) {
        updatedMapping += `  "${result.species.toLowerCase().replace(/\s+/g, "-")}": {\n`
        updatedMapping += `    iNaturalistId: "${result.correctId}", // Updated from ${result.currentId}\n`
        updatedMapping += `    commonNames: ${JSON.stringify(species.commonNames)},\n`
        updatedMapping += `    scientificName: "${result.species}",\n`
        updatedMapping += `    // ... rest of species data\n`
        updatedMapping += `  },\n`
      }
    }
  }

  updatedMapping += "}\n"
  return updatedMapping
}
