import { searchFungi } from "./inaturalist"
import { searchWikipedia } from "./wikipedia"
import { searchLocalSpecies } from "@/lib/data/local-species-db"

export interface ComprehensiveSearchResult {
  id: string
  scientificName: string
  commonName: string
  source: "inaturalist" | "wikipedia" | "local"
  score: number
  thumbnail?: string
  description?: string
}

// Common mushroom name mappings for better search
const COMMON_NAME_MAPPINGS: Record<string, string[]> = {
  "lions mane": ["Hericium erinaceus", "lion's mane", "bearded tooth", "hedgehog mushroom"],
  "lion's mane": ["Hericium erinaceus", "lions mane", "bearded tooth"],
  reishi: ["Ganoderma lucidum", "lingzhi", "mannentake"],
  shiitake: ["Lentinula edodes", "black forest mushroom"],
  oyster: ["Pleurotus ostreatus", "oyster mushroom"],
  button: ["Agaricus bisporus", "button mushroom", "white mushroom"],
  portobello: ["Agaricus bisporus", "portabella", "portobella"],
  chanterelle: ["Cantharellus cibarius", "golden chanterelle"],
  morel: ["Morchella", "morel mushroom"],
  porcini: ["Boletus edulis", "penny bun", "cep"],
  "turkey tail": ["Trametes versicolor", "turkey tail mushroom"],
  chaga: ["Inonotus obliquus"],
  cordyceps: ["Cordyceps militaris", "caterpillar fungus"],
  maitake: ["Grifola frondosa", "hen of the woods"],
  enoki: ["Flammulina velutipes", "enokitake", "golden needle mushroom"],
}

// Normalize search query
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/\s+/g, " ") // Normalize spaces
}

// Calculate similarity score using multiple methods
function calculateSimilarity(query: string, target: string): number {
  const normalizedQuery = normalizeQuery(query)
  const normalizedTarget = normalizeQuery(target)

  // Exact match
  if (normalizedQuery === normalizedTarget) return 1.0

  // Contains match
  if (normalizedTarget.includes(normalizedQuery)) return 0.9

  // Starts with match
  if (normalizedTarget.startsWith(normalizedQuery)) return 0.85

  // Word-by-word match
  const queryWords = normalizedQuery.split(" ")
  const targetWords = normalizedTarget.split(" ")
  const matchingWords = queryWords.filter((word) => targetWords.some((tw) => tw.includes(word) || word.includes(tw)))
  const wordScore = matchingWords.length / queryWords.length

  if (wordScore > 0.5) return 0.7 * wordScore

  // Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(normalizedQuery, normalizedTarget)
  const maxLength = Math.max(normalizedQuery.length, normalizedTarget.length)
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

// Expand query with common name mappings
function expandQuery(query: string): string[] {
  const normalized = normalizeQuery(query)
  const expansions = [normalized]

  // Check for direct mappings
  Object.entries(COMMON_NAME_MAPPINGS).forEach(([key, values]) => {
    if (calculateSimilarity(normalized, key) > 0.8) {
      expansions.push(...values.map(normalizeQuery))
    }
  })

  // Add variations
  if (normalized.includes(" ")) {
    // Try without spaces
    expansions.push(normalized.replace(/\s+/g, ""))
    // Try with hyphens
    expansions.push(normalized.replace(/\s+/g, "-"))
  }

  return [...new Set(expansions)]
}

export async function comprehensiveSearch(query: string, limit = 10): Promise<ComprehensiveSearchResult[]> {
  const results: ComprehensiveSearchResult[] = []
  const expandedQueries = expandQuery(query)

  console.log("[v0] Comprehensive search for:", query)
  console.log("[v0] Expanded queries:", expandedQueries)

  const localResults = searchLocalSpecies(query, limit)
  localResults.forEach((species) => {
    results.push({
      id: species.id,
      scientificName: species.scientificName,
      commonName: species.commonName,
      source: "local",
      score: 0.95, // High score for local matches
      thumbnail: species.thumbnail,
      description: species.description,
    })
  })

  if (results.length < 5) {
    for (const expandedQuery of expandedQueries.slice(0, 1)) {
      try {
        const iNatResponse = await searchFungi(expandedQuery)
        const iNatResults = iNatResponse.results || []

        iNatResults.forEach((result: any) => {
          const commonName = result.preferred_common_name || result.name
          const scientificName = result.name

          // Calculate relevance score
          const commonScore = calculateSimilarity(query, commonName)
          const scientificScore = calculateSimilarity(query, scientificName)
          const score = Math.max(commonScore, scientificScore)

          if (score > 0.3) {
            results.push({
              id: result.id.toString(),
              scientificName,
              commonName,
              source: "inaturalist",
              score,
              thumbnail: result.default_photo?.medium_url,
              description: result.wikipedia_summary?.substring(0, 150),
            })
          }
        })

        if (results.length >= limit) break
      } catch (error) {
        console.error(`[v0] iNaturalist search failed for "${expandedQuery}":`, error)
      }
    }
  }

  if (results.length < 3) {
    try {
      const wikiResults = await searchWikipedia(query)
      wikiResults.forEach((result: any) => {
        const score = calculateSimilarity(query, result.title)
        if (score > 0.3) {
          results.push({
            id: `wiki-${result.pageid}`,
            scientificName: result.title,
            commonName: result.title,
            source: "wikipedia",
            score: score * 0.8, // Slightly lower priority for Wikipedia
            description: result.extract,
          })
        }
      })
    } catch (error) {
      console.error("[v0] Wikipedia search failed:", error)
    }
  }

  // Remove duplicates and sort by score
  const uniqueResults = results
    .filter(
      (result, index, self) =>
        index === self.findIndex((r) => r.scientificName === result.scientificName || r.id === result.id),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  console.log("[v0] Found", uniqueResults.length, "unique results")

  return uniqueResults
}
