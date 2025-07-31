import { SPECIES_MAPPING } from "@/lib/services/species-mapping"

export function findSpeciesBySearchTerm(term: string) {
  if (!term) return null

  const normalizedTerm = term.toLowerCase().trim()

  return Object.values(SPECIES_MAPPING).find((species) => {
    // Check common names
    if (species.commonNames.some((name) => name.toLowerCase().includes(normalizedTerm))) {
      return true
    }

    // Check scientific name
    if (species.scientificName.toLowerCase().includes(normalizedTerm)) {
      return true
    }

    // Check search terms
    if (species.searchTerms?.some((searchTerm) => normalizedTerm.includes(searchTerm.toLowerCase()))) {
      return true
    }

    return false
  })
}
