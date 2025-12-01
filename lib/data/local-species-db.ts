// Local species database for fallback when APIs are rate-limited
export interface LocalSpecies {
  id: string
  scientificName: string
  commonName: string
  description: string
  thumbnail?: string
}

export const LOCAL_SPECIES_DB: LocalSpecies[] = [
  {
    id: "48250",
    scientificName: "Hericium erinaceus",
    commonName: "Lion's Mane",
    description: "A distinctive white mushroom with cascading spines, known for cognitive benefits",
    thumbnail: "/lions-mane-mushroom.png",
  },
  {
    id: "47378",
    scientificName: "Ganoderma lucidum",
    commonName: "Reishi",
    description: "A woody polypore mushroom with a glossy red-brown cap, used in traditional medicine",
    thumbnail: "/reishi-mushroom.png",
  },
  {
    id: "48701",
    scientificName: "Lentinula edodes",
    commonName: "Shiitake",
    description: "A popular edible mushroom with a brown cap and white gills",
    thumbnail: "/shiitake-mushroom.png",
  },
  {
    id: "47169",
    scientificName: "Pleurotus ostreatus",
    commonName: "Oyster Mushroom",
    description: "A fan-shaped edible mushroom that grows in shelf-like clusters",
    thumbnail: "/oyster-mushroom.jpg",
  },
  {
    id: "48715",
    scientificName: "Agaricus bisporus",
    commonName: "Button Mushroom",
    description: "The most commonly cultivated mushroom worldwide",
    thumbnail: "/button-mushroom.png",
  },
  {
    id: "54743",
    scientificName: "Cantharellus cibarius",
    commonName: "Golden Chanterelle",
    description: "A prized edible mushroom with a golden-yellow color and fruity aroma",
    thumbnail: "/golden-chanterelle.png",
  },
  {
    id: "118974",
    scientificName: "Morchella esculenta",
    commonName: "Morel",
    description: "A highly prized edible mushroom with a distinctive honeycomb appearance",
    thumbnail: "/morel-mushroom.jpg",
  },
  {
    id: "48701",
    scientificName: "Boletus edulis",
    commonName: "Porcini",
    description: "A highly valued edible mushroom with a brown cap and thick white stem",
    thumbnail: "/porcini-mushroom.png",
  },
  {
    id: "48438",
    scientificName: "Trametes versicolor",
    commonName: "Turkey Tail",
    description: "A colorful polypore mushroom with concentric zones of different colors",
    thumbnail: "/turkey-tail-mushroom.jpg",
  },
  {
    id: "48701",
    scientificName: "Inonotus obliquus",
    commonName: "Chaga",
    description: "A parasitic fungus that grows on birch trees, used in traditional medicine",
    thumbnail: "/chaga-mushroom.jpg",
  },
  {
    id: "126887",
    scientificName: "Cordyceps militaris",
    commonName: "Cordyceps",
    description: "An orange club-shaped fungus that parasitizes insect larvae",
    thumbnail: "/cordyceps-mushroom.jpg",
  },
  {
    id: "54718",
    scientificName: "Grifola frondosa",
    commonName: "Maitake",
    description: "A large polypore mushroom that grows in clusters at the base of trees",
    thumbnail: "/maitake-mushroom.png",
  },
  {
    id: "48539",
    scientificName: "Flammulina velutipes",
    commonName: "Enoki",
    description: "A small white mushroom with long thin stems, popular in Asian cuisine",
    thumbnail: "/enoki-mushroom.jpg",
  },
  {
    id: "48087",
    scientificName: "Psilocybe cubensis",
    commonName: "Golden Teacher",
    description: "A species of psychedelic mushroom with a golden-brown cap",
    thumbnail: "/psilocybe-cubensis.jpg",
  },
  {
    id: "48086",
    scientificName: "Psilocybe semilanceata",
    commonName: "Liberty Cap",
    description: "A small psychedelic mushroom with a distinctive pointed cap",
    thumbnail: "/liberty-cap-mushroom.jpg",
  },
  {
    id: "48438",
    scientificName: "Amanita muscaria",
    commonName: "Fly Agaric",
    description: "An iconic red mushroom with white spots, known for its psychoactive properties",
    thumbnail: "/amanita-muscaria.jpg",
  },
  {
    id: "48438",
    scientificName: "Amanita phalloides",
    commonName: "Death Cap",
    description: "One of the most poisonous mushrooms, responsible for most fatal mushroom poisonings",
    thumbnail: "/death-cap-mushroom.jpg",
  },
  {
    id: "48701",
    scientificName: "Lactarius deliciosus",
    commonName: "Saffron Milk Cap",
    description: "An edible mushroom that exudes orange latex when cut",
    thumbnail: "/saffron-milk-cap.jpg",
  },
  {
    id: "48701",
    scientificName: "Coprinus comatus",
    commonName: "Shaggy Mane",
    description: "An edible mushroom with a distinctive shaggy white cap that deliquesces into black ink",
    thumbnail: "/shaggy-mane-mushroom.jpg",
  },
  {
    id: "48701",
    scientificName: "Laetiporus sulphureus",
    commonName: "Chicken of the Woods",
    description: "A bright orange-yellow polypore mushroom with a chicken-like texture when cooked",
    thumbnail: "/chicken-of-the-woods.jpg",
  },
  {
    id: "47304",
    scientificName: "Amanita caesarea",
    commonName: "Caesar's Mushroom",
    description: "An edible orange-capped mushroom prized by ancient Romans",
    thumbnail: "/caesar-s-mushroom.jpg",
  },
  {
    id: "51234",
    scientificName: "Calvatia gigantea",
    commonName: "Giant Puffball",
    description: "A large spherical mushroom that can grow up to 150 cm in diameter",
    thumbnail: "/giant-puffball.jpg",
  },
  {
    id: "48329",
    scientificName: "Lycoperdon perlatum",
    commonName: "Common Puffball",
    description: "A small puffball mushroom that releases spores when mature",
    thumbnail: "/common-puffball.jpg",
  },
  {
    id: "54872",
    scientificName: "Hypholoma fasciculare",
    commonName: "Sulphur Tuft",
    description: "A poisonous mushroom that grows in dense clusters on wood",
    thumbnail: "/sulphur-tuft.jpg",
  },
  {
    id: "49021",
    scientificName: "Armillaria mellea",
    commonName: "Honey Fungus",
    description: "A parasitic mushroom that causes root rot in trees",
    thumbnail: "/honey-fungus.jpg",
  },
  {
    id: "48503",
    scientificName: "Clitocybe nebularis",
    commonName: "Clouded Funnel",
    description: "A large edible mushroom with a cloudy gray cap",
    thumbnail: "/clouded-funnel.jpg",
  },
  {
    id: "52109",
    scientificName: "Russula emetica",
    commonName: "The Sickener",
    description: "A red-capped mushroom that causes vomiting if eaten",
    thumbnail: "/the-sickener-mushroom.jpg",
  },
  {
    id: "48921",
    scientificName: "Marasmius oreades",
    commonName: "Fairy Ring Mushroom",
    description: "An edible mushroom that grows in circular patterns called fairy rings",
    thumbnail: "/fairy-ring-mushroom.jpg",
  },
  {
    id: "51432",
    scientificName: "Lepiota procera",
    commonName: "Parasol Mushroom",
    description: "A tall mushroom with a large umbrella-like cap",
    thumbnail: "/parasol-mushroom.jpg",
  },
  {
    id: "48702",
    scientificName: "Cortinarius violaceus",
    commonName: "Violet Webcap",
    description: "A distinctive purple mushroom found in coniferous forests",
    thumbnail: "/violet-webcap.jpg",
  },
]

// Search local database with fuzzy matching
export function searchLocalSpecies(query: string, limit = 10): LocalSpecies[] {
  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) return []

  const results = LOCAL_SPECIES_DB.map((species) => {
    const commonScore = calculateSimilarity(normalizedQuery, species.commonName.toLowerCase())
    const scientificScore = calculateSimilarity(normalizedQuery, species.scientificName.toLowerCase())
    const score = Math.max(commonScore, scientificScore)

    return { species, score }
  })
    .filter((result) => result.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((result) => result.species)

  return results
}

function calculateSimilarity(query: string, target: string): number {
  // Exact match
  if (query === target) return 1.0

  // Contains match
  if (target.includes(query)) return 0.9

  // Starts with match
  if (target.startsWith(query)) return 0.85

  // Word-by-word match
  const queryWords = query.split(" ")
  const targetWords = target.split(" ")
  const matchingWords = queryWords.filter((word) => targetWords.some((tw) => tw.includes(word) || word.includes(tw)))
  const wordScore = matchingWords.length / queryWords.length

  if (wordScore > 0.5) return 0.7 * wordScore

  // Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(query, target)
  const maxLength = Math.max(query.length, target.length)
  const similarity = 1 - distance / maxLength

  return similarity > 0.6 ? similarity * 0.6 : 0
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}
