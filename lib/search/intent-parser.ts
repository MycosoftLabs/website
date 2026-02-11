/**
 * Intent Parser for Search Queries
 * 
 * Parses natural language queries to extract:
 * - Entity type (species, compound, media, research, general)
 * - Filters (toxicity, location, timeframe, media type)
 * - Entities mentioned
 * - Query type (factual, comparison, list, etc.)
 */

export type EntityType = "species" | "compound" | "media" | "research" | "location" | "general"

export type ToxicityFilter = "poisonous" | "toxic" | "deadly" | "edible" | "medicinal" | "psychedelic" | "hallucinogenic"

export type MediaType = "movies" | "tv" | "documentaries" | "news" | "books" | "games"

export type QueryType = "factual" | "comparison" | "list" | "identification" | "howto" | "news" | "definition"

export interface LocationFilter {
  city?: string
  region?: string
  state?: string
  country?: string
  lat?: number
  lng?: number
  radius?: number // km
}

export interface SearchFilters {
  toxicity?: ToxicityFilter
  location?: LocationFilter
  timeframe?: "recent" | "historical" | "all"
  mediaType?: MediaType
  edibility?: "edible" | "inedible" | "unknown"
}

export interface SearchIntent {
  type: EntityType
  queryType: QueryType
  filters: SearchFilters
  entities: string[]
  keywords: string[]
  originalQuery: string
  normalizedQuery: string
  confidence: number
}

// Location database for common cities/regions
const LOCATIONS: Record<string, Partial<LocationFilter>> = {
  "san diego": { city: "San Diego", state: "California", country: "USA", lat: 32.7157, lng: -117.1611 },
  "los angeles": { city: "Los Angeles", state: "California", country: "USA", lat: 34.0522, lng: -118.2437 },
  "san francisco": { city: "San Francisco", state: "California", country: "USA", lat: 37.7749, lng: -122.4194 },
  "seattle": { city: "Seattle", state: "Washington", country: "USA", lat: 47.6062, lng: -122.3321 },
  "portland": { city: "Portland", state: "Oregon", country: "USA", lat: 45.5152, lng: -122.6784 },
  "new york": { city: "New York", state: "New York", country: "USA", lat: 40.7128, lng: -74.0060 },
  "denver": { city: "Denver", state: "Colorado", country: "USA", lat: 39.7392, lng: -104.9903 },
  "austin": { city: "Austin", state: "Texas", country: "USA", lat: 30.2672, lng: -97.7431 },
  "miami": { city: "Miami", state: "Florida", country: "USA", lat: 25.7617, lng: -80.1918 },
  "chicago": { city: "Chicago", state: "Illinois", country: "USA", lat: 41.8781, lng: -87.6298 },
  "california": { state: "California", country: "USA", lat: 36.7783, lng: -119.4179 },
  "oregon": { state: "Oregon", country: "USA", lat: 43.8041, lng: -120.5542 },
  "washington": { state: "Washington", country: "USA", lat: 47.7511, lng: -120.7401 },
  "pacific northwest": { region: "Pacific Northwest", country: "USA", lat: 46.0, lng: -122.0 },
  "northeast": { region: "Northeast", country: "USA", lat: 42.0, lng: -74.0 },
  "uk": { country: "United Kingdom", lat: 55.3781, lng: -3.4360 },
  "england": { country: "United Kingdom", lat: 52.3555, lng: -1.1743 },
  "europe": { region: "Europe", lat: 50.0, lng: 10.0 },
  "asia": { region: "Asia", lat: 35.0, lng: 105.0 },
  "japan": { country: "Japan", lat: 36.2048, lng: 138.2529 },
  "australia": { country: "Australia", lat: -25.2744, lng: 133.7751 },
}

// Toxicity keywords
const TOXICITY_KEYWORDS: Record<ToxicityFilter, string[]> = {
  poisonous: ["poisonous", "poison", "venomous", "toxic"],
  toxic: ["toxic", "toxin", "toxicity"],
  deadly: ["deadly", "lethal", "fatal", "death", "kill"],
  edible: ["edible", "eat", "eating", "culinary", "cooking", "food"],
  medicinal: ["medicinal", "medicine", "health", "therapeutic", "healing", "benefit"],
  psychedelic: ["psychedelic", "psychoactive", "trip", "tripping"],
  hallucinogenic: ["hallucinogenic", "hallucination", "magic", "psilocybin", "psilocin"],
}

// Media type keywords
const MEDIA_KEYWORDS: Record<MediaType, string[]> = {
  movies: ["movie", "movies", "film", "films", "cinema"],
  tv: ["tv", "television", "show", "shows", "series", "episode"],
  documentaries: ["documentary", "documentaries", "doc", "docs"],
  news: ["news", "article", "articles", "headline", "current"],
  books: ["book", "books", "novel", "literature", "read"],
  games: ["game", "games", "video game", "gaming"],
}

// Species/genus keywords (common fungi)
const SPECIES_KEYWORDS = [
  "mushroom", "mushrooms", "fungi", "fungus", "mycelium",
  "amanita", "psilocybe", "agaricus", "boletus", "cantharellus",
  "ganoderma", "hericium", "pleurotus", "morchella", "tuber",
  "cortinarius", "galerina", "gyromitra", "lactarius", "russula",
  "chanterelle", "chanterelles", "morel", "morels", "truffle", "truffles",
  "lion's mane", "lions mane", "reishi", "shiitake", "oyster mushroom",
  "turkey tail", "cordyceps", "chaga", "maitake", "enoki",
  "death cap", "destroying angel", "fly agaric", "liberty cap",
]

// Compound/chemistry keywords
const COMPOUND_KEYWORDS = [
  "compound", "compounds", "chemical", "chemicals", "molecule",
  "psilocybin", "psilocin", "amatoxin", "amatoxins", "muscimol",
  "ibotenic", "gyromitrin", "orellanine", "coprine", "muscarine",
  "ergotamine", "lsd", "tryptamine", "beta-glucan", "polysaccharide",
  "chitin", "melanin", "antioxidant", "formula", "structure",
]

// Research keywords
const RESEARCH_KEYWORDS = [
  "research", "study", "studies", "paper", "papers", "journal",
  "scientist", "scientists", "experiment", "experiments", "trial",
  "clinical", "publication", "published", "findings", "evidence",
  "peer-reviewed", "academic", "university", "laboratory",
]

// Query type patterns
const QUERY_PATTERNS: { pattern: RegExp; type: QueryType }[] = [
  { pattern: /^what (is|are|does)/i, type: "definition" },
  { pattern: /^how (to|do|can|should)/i, type: "howto" },
  { pattern: /^(list|show me|give me|find)\s+(all|the)/i, type: "list" },
  { pattern: /(vs|versus|compared to|difference between|better than)/i, type: "comparison" },
  { pattern: /^(identify|identification|is this|what kind)/i, type: "identification" },
  { pattern: /(latest|recent|news|today|this week)/i, type: "news" },
  { pattern: /(most|top|best|worst|deadliest|largest|smallest)/i, type: "list" },
]

/**
 * Parse a search query and extract intent
 */
export function parseSearchIntent(query: string): SearchIntent {
  const originalQuery = query
  const normalizedQuery = query.toLowerCase().trim()
  const words = normalizedQuery.split(/\s+/)

  const filters: SearchFilters = {}
  const entities: string[] = []
  const keywords: string[] = []

  // Detect location
  for (const [locationKey, locationData] of Object.entries(LOCATIONS)) {
    if (normalizedQuery.includes(locationKey)) {
      filters.location = { ...locationData, radius: 100 }
      break
    }
  }

  // Detect toxicity
  for (const [toxicity, toxicityKeywords] of Object.entries(TOXICITY_KEYWORDS)) {
    if (toxicityKeywords.some(kw => normalizedQuery.includes(kw))) {
      filters.toxicity = toxicity as ToxicityFilter
      break
    }
  }

  // Detect media type
  for (const [mediaType, mediaKeywords] of Object.entries(MEDIA_KEYWORDS)) {
    if (mediaKeywords.some(kw => normalizedQuery.includes(kw))) {
      filters.mediaType = mediaType as MediaType
      break
    }
  }

  // Detect timeframe
  if (normalizedQuery.includes("recent") || normalizedQuery.includes("latest") || normalizedQuery.includes("new")) {
    filters.timeframe = "recent"
  } else if (normalizedQuery.includes("historical") || normalizedQuery.includes("ancient") || normalizedQuery.includes("traditional")) {
    filters.timeframe = "historical"
  }

  // Extract species/genus entities
  for (const speciesKw of SPECIES_KEYWORDS) {
    if (normalizedQuery.includes(speciesKw)) {
      keywords.push(speciesKw)
      // Add as entity if it's a specific genus/species name
      if (!["mushroom", "mushrooms", "fungi", "fungus", "mycelium"].includes(speciesKw)) {
        entities.push(speciesKw)
      }
    }
  }

  // Extract compound entities
  for (const compoundKw of COMPOUND_KEYWORDS) {
    if (normalizedQuery.includes(compoundKw)) {
      keywords.push(compoundKw)
      if (!["compound", "compounds", "chemical", "chemicals", "molecule", "formula", "structure"].includes(compoundKw)) {
        entities.push(compoundKw)
      }
    }
  }

  // Determine entity type
  let type: EntityType = "general"
  let confidence = 0.5

  if (filters.mediaType) {
    type = "media"
    confidence = 0.85
  } else if (RESEARCH_KEYWORDS.some(kw => normalizedQuery.includes(kw))) {
    type = "research"
    confidence = 0.8
  } else if (COMPOUND_KEYWORDS.some(kw => normalizedQuery.includes(kw)) && !SPECIES_KEYWORDS.some(kw => normalizedQuery.includes(kw))) {
    type = "compound"
    confidence = 0.8
  } else if (filters.location && !keywords.length) {
    type = "location"
    confidence = 0.75
  } else if (keywords.length > 0) {
    type = "species"
    confidence = 0.85
  }

  // Boost confidence if multiple signals align
  if (filters.toxicity && type === "species") confidence = Math.min(0.95, confidence + 0.1)
  if (filters.location && type === "species") confidence = Math.min(0.95, confidence + 0.1)
  if (entities.length > 1) confidence = Math.min(0.95, confidence + 0.05)

  // Determine query type
  let queryType: QueryType = "factual"
  for (const { pattern, type: qType } of QUERY_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      queryType = qType
      break
    }
  }

  return {
    type,
    queryType,
    filters,
    entities,
    keywords,
    originalQuery,
    normalizedQuery,
    confidence,
  }
}

/**
 * Get search parameters based on intent
 */
export function getSearchParamsFromIntent(intent: SearchIntent): {
  types: string[]
  limit: number
  includeAI: boolean
  locationBased: boolean
} {
  const types: string[] = []
  let limit = 20
  let includeAI = true
  let locationBased = false

  switch (intent.type) {
    case "species":
      types.push("species", "genetics")
      if (intent.filters.toxicity) types.push("compounds")
      if (intent.queryType === "list") limit = 50
      break
    case "compound":
      types.push("compounds", "species", "research")
      break
    case "research":
      types.push("research", "species")
      break
    case "media":
      types.push("media")
      includeAI = true // AI can provide media info
      break
    case "location":
      types.push("species", "observations")
      locationBased = true
      break
    default:
      types.push("species", "compounds", "genetics", "research")
  }

  if (intent.filters.location) {
    locationBased = true
  }

  return { types, limit, includeAI, locationBased }
}

/**
 * Build AI context from intent for more relevant answers
 */
export function buildAIContextFromIntent(intent: SearchIntent, previousSearches?: string[]): string {
  const parts: string[] = []

  if (intent.type !== "general") {
    parts.push(`Query type: ${intent.type}`)
  }

  if (intent.entities.length > 0) {
    parts.push(`Entities mentioned: ${intent.entities.join(", ")}`)
  }

  if (intent.filters.toxicity) {
    parts.push(`User is interested in: ${intent.filters.toxicity} species`)
  }

  if (intent.filters.location) {
    const loc = intent.filters.location
    const locStr = [loc.city, loc.state, loc.region, loc.country].filter(Boolean).join(", ")
    parts.push(`Location context: ${locStr}`)
  }

  if (intent.filters.mediaType) {
    parts.push(`Looking for: ${intent.filters.mediaType} about fungi`)
  }

  if (previousSearches && previousSearches.length > 0) {
    parts.push(`Previous searches: ${previousSearches.slice(0, 5).join(", ")}`)
  }

  if (intent.queryType === "list") {
    parts.push("User wants a ranked/listed response")
  } else if (intent.queryType === "comparison") {
    parts.push("User wants a comparison between items")
  } else if (intent.queryType === "howto") {
    parts.push("User wants instructions/guidance")
  }

  return parts.length > 0 ? `Context: ${parts.join(". ")}` : ""
}

/**
 * Extract potential species names from a query for targeted searches
 */
export function extractSpeciesNames(query: string): string[] {
  const normalizedQuery = query.toLowerCase()
  const found: string[] = []

  // Common genus names (capitalize first letter for scientific format)
  const genera = [
    "amanita", "psilocybe", "agaricus", "boletus", "cantharellus",
    "ganoderma", "hericium", "pleurotus", "morchella", "tuber",
    "cortinarius", "galerina", "gyromitra", "lactarius", "russula",
    "inocybe", "clitocybe", "hygrocybe", "tricholoma", "suillus",
  ]

  for (const genus of genera) {
    if (normalizedQuery.includes(genus)) {
      // Extract genus + potential species epithet
      const regex = new RegExp(`${genus}\\s+(\\w+)?`, "i")
      const match = normalizedQuery.match(regex)
      if (match) {
        const speciesName = match[1]
          ? `${genus.charAt(0).toUpperCase() + genus.slice(1)} ${match[1]}`
          : genus.charAt(0).toUpperCase() + genus.slice(1)
        found.push(speciesName)
      } else {
        found.push(genus.charAt(0).toUpperCase() + genus.slice(1))
      }
    }
  }

  // Common names to scientific names mapping
  const commonToScientific: Record<string, string> = {
    "death cap": "Amanita phalloides",
    "destroying angel": "Amanita virosa",
    "fly agaric": "Amanita muscaria",
    "liberty cap": "Psilocybe semilanceata",
    "lion's mane": "Hericium erinaceus",
    "lions mane": "Hericium erinaceus",
    "reishi": "Ganoderma lucidum",
    "shiitake": "Lentinula edodes",
    "oyster mushroom": "Pleurotus ostreatus",
    "turkey tail": "Trametes versicolor",
    "chaga": "Inonotus obliquus",
    "maitake": "Grifola frondosa",
    "enoki": "Flammulina velutipes",
    "chanterelle": "Cantharellus cibarius",
    "morel": "Morchella esculenta",
    "porcini": "Boletus edulis",
    "king bolete": "Boletus edulis",
    "matsutake": "Tricholoma matsutake",
  }

  for (const [common, scientific] of Object.entries(commonToScientific)) {
    if (normalizedQuery.includes(common)) {
      found.push(scientific)
    }
  }

  return [...new Set(found)] // Deduplicate
}

export default parseSearchIntent
