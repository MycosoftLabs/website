import { COMPOUND_MAPPING, type Compound } from "@/lib/data/compounds"

interface ValidationResult {
  isValid: boolean
  normalizedId?: string
  compoundName?: string
  chemicalClass?: string
  error?: string
}

export function validateCompoundId(id: string): ValidationResult {
  try {
    // Handle empty or invalid input
    if (!id || typeof id !== "string") {
      return {
        isValid: false,
        error: "Invalid compound ID format",
      }
    }

    // Check if this is a known compound
    const compound = Object.values(COMPOUND_MAPPING).find((compound) => compound.id === id)

    if (compound) {
      return {
        isValid: true,
        normalizedId: compound.id,
        compoundName: compound.name,
        chemicalClass: compound.chemicalClass,
      }
    }

    // If it's a ChemSpider ID format
    if (id.startsWith("CS") && /^CS\d+$/.test(id)) {
      return {
        isValid: true,
        normalizedId: id,
      }
    }

    return {
      isValid: false,
      error: "Invalid compound ID format",
    }
  } catch (error) {
    console.error("Compound validation error:", error)
    return {
      isValid: false,
      error: "Failed to validate compound ID",
    }
  }
}

export function validateCompoundStructure(compound: Partial<Compound>): ValidationResult {
  try {
    // Required fields
    const requiredFields: Array<keyof Compound> = [
      "id",
      "name",
      "formula",
      "molecularWeight",
      "chemicalClass",
      "description",
      "sourceSpecies",
      "biologicalActivity",
    ]

    const missingFields = requiredFields.filter((field) => !compound[field])

    if (missingFields.length > 0) {
      return {
        isValid: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      }
    }

    // Validate arrays are not empty
    if (!compound.sourceSpecies?.length || !compound.biologicalActivity?.length) {
      return {
        isValid: false,
        error: "Source species and biological activity arrays cannot be empty",
      }
    }

    // Validate molecular weight is positive
    if (compound.molecularWeight && compound.molecularWeight <= 0) {
      return {
        isValid: false,
        error: "Molecular weight must be positive",
      }
    }

    return {
      isValid: true,
      normalizedId: compound.id,
      compoundName: compound.name,
      chemicalClass: compound.chemicalClass,
    }
  } catch (error) {
    console.error("Compound structure validation error:", error)
    return {
      isValid: false,
      error: "Failed to validate compound structure",
    }
  }
}
