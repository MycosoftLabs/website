interface FungiDBSpecies {
  scientific_name: string
  common_name?: string
  description?: string
  taxonomy: {
    kingdom: string
    phylum: string
    class: string
    order: string
    family: string
    genus: string
    species: string
  }
  characteristics?: {
    morphology?: string
    habitat?: string[]
    distribution?: string[]
  }
}

// Mock data for common fungi
const MOCK_SPECIES: FungiDBSpecies[] = [
  {
    scientific_name: "Ganoderma lucidum",
    common_name: "Reishi",
    description: "A polypore mushroom that has been used in traditional Asian medicine for thousands of years.",
    taxonomy: {
      kingdom: "Fungi",
      phylum: "Basidiomycota",
      class: "Agaricomycetes",
      order: "Polyporales",
      family: "Ganodermataceae",
      genus: "Ganoderma",
      species: "G. lucidum",
    },
    characteristics: {
      morphology: "Red-varnished, kidney-shaped cap with white edges",
      habitat: ["dead or dying hardwood trees", "stumps"],
      distribution: ["worldwide", "temperate and tropical regions"],
    },
  },
  {
    scientific_name: "Cordyceps militaris",
    common_name: "Orange Cordyceps",
    description: "An entomopathogenic fungus, meaning it parasitizes insects.",
    taxonomy: {
      kingdom: "Fungi",
      phylum: "Ascomycota",
      class: "Sordariomycetes",
      order: "Hypocreales",
      family: "Cordycipitaceae",
      genus: "Cordyceps",
      species: "C. militaris",
    },
    characteristics: {
      morphology: "Orange, club-shaped fruiting bodies",
      habitat: ["parasitic on butterfly and moth pupae"],
      distribution: ["North America", "Asia", "Europe"],
    },
  },
]

export async function searchFungiDB(query: string): Promise<FungiDBSpecies[]> {
  if (!query.trim()) {
    return []
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Search mock data
  const normalizedQuery = query.toLowerCase()
  return MOCK_SPECIES.filter(
    (species) =>
      species.scientific_name.toLowerCase().includes(normalizedQuery) ||
      species.common_name?.toLowerCase().includes(normalizedQuery) ||
      species.description?.toLowerCase().includes(normalizedQuery),
  )
}

export async function getFungiDBDetails(scientificName: string): Promise<FungiDBSpecies | null> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return MOCK_SPECIES.find((species) => species.scientific_name === scientificName) || null
}
