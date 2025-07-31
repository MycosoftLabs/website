import { SPECIES_MAPPING } from "./species-mapping"

interface ResearchHubArticle {
  id: string
  title: string
  abstract: string
  authors: string[]
  doi?: string
  url: string
  publishedDate: string
  journal?: string
}

// Mock research data for known species
const MOCK_RESEARCH: Record<string, ResearchHubArticle[]> = {
  "48701": [
    // Lion's Mane
    {
      id: "1",
      title: "Neurotrophic properties of the Lion's mane medicinal mushroom, Hericium erinaceus",
      abstract: "Study examining the cognitive enhancement and neuroprotective effects.",
      authors: ["Lai, P.L.", "Naidu, M.", "Sabaratnam, V."],
      doi: "10.1016/j.phymed.2023.154819",
      url: "https://pubmed.ncbi.nlm.nih.gov/12675140/",
      publishedDate: "2024-01-15",
      journal: "International Journal of Medicinal Mushrooms",
    },
    {
      id: "2",
      title: "Hericium erinaceus Improves Recognition Memory and Induces Hippocampal and Cerebellar Neurogenesis",
      abstract: "Investigation of the effects of H. erinaceus on memory and neurogenesis.",
      authors: ["Ratto, D.", "Corana, F.", "Rossi, P."],
      doi: "10.3390/nu12123518",
      url: "https://pubmed.ncbi.nlm.nih.gov/33233531/",
      publishedDate: "2023-12-01",
      journal: "Nutrients",
    },
  ],
  "127382": [
    // Cordyceps
    {
      id: "3",
      title: "Cordyceps militaris Improves Exercise Performance and Protects against Muscle Damage",
      abstract: "Study on the effects of C. militaris on exercise performance.",
      authors: ["Jung, K.", "Kim, I.H.", "Han, D."],
      doi: "10.1016/j.jep.2024.01.003",
      url: "https://pubmed.ncbi.nlm.nih.gov/example1",
      publishedDate: "2024-01-20",
      journal: "Journal of Ethnopharmacology",
    },
  ],
  // Add more mock data for other species
}

export async function searchResearchHub(query: string): Promise<ResearchHubArticle[]> {
  try {
    // For now, return mock data if we have it
    const speciesMatch = Object.values(SPECIES_MAPPING).find((species) =>
      species.searchTerms.some((term) => query.toLowerCase().includes(term.toLowerCase())),
    )

    if (speciesMatch) {
      return MOCK_RESEARCH[speciesMatch.iNaturalistId] || []
    }

    // If no match found, return empty array
    return []
  } catch (error) {
    console.error("ResearchHub search error:", error)
    return []
  }
}

export async function getArticlesBySpecies(scientificName: string): Promise<ResearchHubArticle[]> {
  try {
    // Find the species in our mapping first for faster lookup
    const species = Object.values(SPECIES_MAPPING).find(
      (s) => s.scientificName.toLowerCase() === scientificName.toLowerCase(),
    )

    if (species && MOCK_RESEARCH[species.iNaturalistId]) {
      return Promise.resolve(MOCK_RESEARCH[species.iNaturalistId])
    }

    // If no specific articles found, try searching
    return searchResearchHub(scientificName)
  } catch (error) {
    console.error("Error fetching articles by species:", error)
    return Promise.resolve([])
  }
}
