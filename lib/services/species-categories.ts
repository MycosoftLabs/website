// Define species categories and their characteristics
export const SPECIES_CATEGORIES = {
  medicinal: {
    name: "Medicinal Mushrooms",
    description: "Species known for their therapeutic properties and traditional medicinal uses",
    searchTerms: ["medicinal", "healing", "therapeutic", "medicine", "health"],
    subcategories: {
      cognitive: ["Hericium erinaceus", "Ganoderma lucidum"],
      immune: ["Trametes versicolor", "Inonotus obliquus"],
      adaptogenic: ["Cordyceps militaris", "Ganoderma lucidum"],
    },
  },
  culinary: {
    name: "Culinary Mushrooms",
    description: "Edible mushrooms commonly used in cooking",
    searchTerms: ["edible", "cooking", "culinary", "food", "gourmet"],
    subcategories: {
      common: ["Agaricus bisporus", "Pleurotus ostreatus"],
      gourmet: ["Morchella esculenta", "Cantharellus cibarius"],
      asian: ["Lentinula edodes", "Flammulina velutipes"],
    },
  },
  wild: {
    name: "Wild Mushrooms",
    description: "Naturally occurring species found in various habitats",
    searchTerms: ["wild", "forest", "native", "natural"],
    subcategories: {
      woodland: ["Armillaria mellea", "Laetiporus sulphureus"],
      field: ["Calvatia gigantea", "Macrolepiota procera"],
      composite: ["Pleurotus eryngii", "Hydnum repandum"],
    },
  },
  research: {
    name: "Research Interest",
    description: "Species of particular scientific or research importance",
    searchTerms: ["research", "study", "scientific", "taxonomy"],
    subcategories: {
      ethnomycology: ["Psilocybe cubensis", "Amanita muscaria"],
      ecology: ["Armillaria mellea", "Fomitopsis pinicola"],
      biotechnology: ["Ganoderma lucidum", "Trametes versicolor"],
    },
  },
}

export type SpeciesCategory = keyof typeof SPECIES_CATEGORIES

export function getCategoryForSpecies(scientificName: string): SpeciesCategory | null {
  for (const [category, data] of Object.entries(SPECIES_CATEGORIES)) {
    for (const subcategory of Object.values(data.subcategories)) {
      if (subcategory.includes(scientificName)) {
        return category as SpeciesCategory
      }
    }
  }
  return null
}

export function getSpeciesByCategory(category: SpeciesCategory) {
  const categoryData = SPECIES_CATEGORIES[category]
  const species = new Set<string>()

  Object.values(categoryData.subcategories).forEach((subcategory) => {
    subcategory.forEach(species.add, species)
  })

  return Array.from(species)
}

export function searchCategories(query: string): SpeciesCategory[] {
  const normalizedQuery = query.toLowerCase()
  return Object.entries(SPECIES_CATEGORIES)
    .filter(([_, data]) => data.searchTerms.some((term) => term.toLowerCase().includes(normalizedQuery)))
    .map(([category]) => category as SpeciesCategory)
}
