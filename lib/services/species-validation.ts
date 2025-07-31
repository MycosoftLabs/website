import { SPECIES_MAPPING } from "@/lib/services/species-mapping"

export interface ValidationResult {
  isValid: boolean
  normalizedId?: string
  scientificName?: string
  commonNames?: string[]
  iNaturalistId?: string
  error?: string
}

export function validateSpeciesId(id: string): ValidationResult {
  try {
    // Handle empty or invalid input
    if (!id || typeof id !== "string") {
      return {
        isValid: false,
        error: "Invalid species ID format",
      }
    }

    // First check if this is a normalized ID
    const species = Object.values(SPECIES_MAPPING).find(
      (species) => species.iNaturalistId === id || id === species.scientificName.toLowerCase().replace(/\s+/g, "-"),
    )

    if (species) {
      return {
        isValid: true,
        normalizedId: species.scientificName.toLowerCase().replace(/\s+/g, "-"),
        scientificName: species.scientificName,
        commonNames: species.commonNames,
        iNaturalistId: species.iNaturalistId,
      }
    }

    // If numeric, it might be a valid iNaturalist ID we don't know about yet
    if (/^\d+$/.test(id)) {
      return {
        isValid: true,
        iNaturalistId: id,
      }
    }

    return {
      isValid: false,
      error: "Invalid species ID format",
    }
  } catch (error) {
    console.error("Species validation error:", error)
    return {
      isValid: false,
      error: "Failed to validate species ID",
    }
  }
}
