interface MycoBankSpecies {
  id: string
  scientific_name: string
  common_names?: string[]
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
    substrate?: string[]
    ecology?: string
    distribution?: string[]
  }
  references?: Array<{
    title: string
    authors: string[]
    year: number
    doi?: string
  }>
}

// Mock data for common fungi
const MOCK_SPECIES: MycoBankSpecies[] = [
  {
    id: "mb-001",
    scientific_name: "Hericium erinaceus",
    common_names: ["Lion's Mane", "Bearded Tooth Mushroom"],
    description: "A medicinal mushroom known for its distinctive appearance and potential cognitive benefits.",
    taxonomy: {
      kingdom: "Fungi",
      phylum: "Basidiomycota",
      class: "Agaricomycetes",
      order: "Russulales",
      family: "Hericiaceae",
      genus: "Hericium",
      species: "H. erinaceus",
    },
    characteristics: {
      morphology: "White to cream colored fruiting body with spine-like projections",
      substrate: ["hardwood trees", "dead or dying trees"],
      ecology: "Saprobic",
      distribution: ["North America", "Europe", "Asia"],
    },
    references: [
      {
        title: "Neurotrophic properties of the Lion's mane medicinal mushroom, Hericium erinaceus",
        authors: ["Lai PL", "Naidu M", "Sabaratnam V"],
        year: 2013,
        doi: "10.1615/IntJMedMushr.v15.i2.10",
      },
    ],
  },
  {
    id: "mb-002",
    scientific_name: "Trametes versicolor",
    common_names: ["Turkey Tail", "Cloud Mushroom"],
    description: "A common polypore mushroom found throughout the world, known for its immune system benefits.",
    taxonomy: {
      kingdom: "Fungi",
      phylum: "Basidiomycota",
      class: "Agaricomycetes",
      order: "Polyporales",
      family: "Polyporaceae",
      genus: "Trametes",
      species: "T. versicolor",
    },
    characteristics: {
      morphology: "Fan-shaped fruiting bodies with multicolored zones",
      substrate: ["dead hardwood trees", "fallen logs"],
      ecology: "Saprobic",
      distribution: ["Worldwide"],
    },
    references: [
      {
        title: "The mycomedicinal properties of Trametes versicolor (Turkey Tail)",
        authors: ["Smith JE", "Rowan NJ", "Sullivan R"],
        year: 2002,
        doi: "10.1615/IntJMedMushr.v4.i2.10",
      },
    ],
  },
]

export async function searchMycoBank(query: string): Promise<MycoBankSpecies[]> {
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
      species.common_names?.some((name) => name.toLowerCase().includes(normalizedQuery)),
  )
}

export async function getMycoBankDetails(id: string): Promise<MycoBankSpecies | null> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return MOCK_SPECIES.find((species) => species.id === id) || null
}
