import { VERIFIED_SPECIES_MAPPING } from "./verified-species-mapping"
import { SPECIES_CATEGORIES, type SpeciesCategory } from "./species-categories"
import type { SearchSuggestion } from "@/types/search"

interface SuggestionOptions {
  limit?: number
  categories?: SpeciesCategory[]
  includeResearch?: boolean
}

export function getSearchSuggestions(query: string, options: SuggestionOptions = {}): SearchSuggestion[] {
  const {
    limit = 10,
    categories = Object.keys(SPECIES_CATEGORIES) as SpeciesCategory[],
    includeResearch = false,
  } = options

  const normalizedQuery = query.toLowerCase().trim()
  const suggestions: SearchSuggestion[] = []

  // If query is empty, return popular species from each category
  if (!normalizedQuery) {
    categories.forEach((category) => {
      if (!includeResearch && category === "research") return

      const categorySpecies = Object.values(VERIFIED_SPECIES_MAPPING)
        .filter((species) => species.category === category)
        .slice(0, 3)

      suggestions.push(
        ...categorySpecies.map((species) => ({
          id: species.iNaturalistId,
          title: species.commonNames[0],
          type: "fungi" as const,
          scientificName: species.scientificName,
          url: `/species/${species.iNaturalistId}`,
          category: species.category,
        })),
      )
    })

    return suggestions.slice(0, limit)
  }

  // Search through verified species
  const matchedSpecies = Object.values(VERIFIED_SPECIES_MAPPING)
    .filter((species) => {
      if (!includeResearch && species.category === "research") return false
      if (!categories.includes(species.category as SpeciesCategory)) return false

      return (
        species.commonNames.some((name) => name.toLowerCase().includes(normalizedQuery)) ||
        species.scientificName.toLowerCase().includes(normalizedQuery)
      )
    })
    .map((species) => ({
      id: species.iNaturalistId,
      title: species.commonNames[0],
      type: "fungi" as const,
      scientificName: species.scientificName,
      url: `/species/${species.iNaturalistId}`,
      category: species.category,
    }))

  // Add category suggestions if query matches category terms
  const categoryMatches = Object.entries(SPECIES_CATEGORIES)
    .filter(([category, data]) => {
      if (!includeResearch && category === "research") return false
      if (!categories.includes(category as SpeciesCategory)) return false

      return data.searchTerms.some((term) => term.toLowerCase().includes(normalizedQuery))
    })
    .map(([category, data]) => ({
      id: `category-${category}`,
      title: data.name,
      type: "category" as const,
      url: `/categories/${category}`,
      description: data.description,
    }))

  return [...matchedSpecies, ...categoryMatches].slice(0, limit)
}

export function getPopularSpecies(category?: SpeciesCategory): SearchSuggestion[] {
  const species = Object.values(VERIFIED_SPECIES_MAPPING)
    .filter((s) => !category || s.category === category)
    .slice(0, 10)
    .map((s) => ({
      id: s.iNaturalistId,
      title: s.commonNames[0],
      type: "fungi" as const,
      scientificName: s.scientificName,
      url: `/species/${s.iNaturalistId}`,
      category: s.category,
    }))

  return species
}
