import { SPECIES_MAPPING } from "@/lib/services/species-mapping"

interface FuzzySearchResult {
  term: string
  score: number
  type: "species" | "common_name" | "search_term"
  speciesId: string
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null))

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i
  }

  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      )
    }
  }

  return track[str2.length][str1.length]
}

// Calculate similarity score between two strings (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  return 1 - distance / maxLength
}

// Find similar terms from our species mapping
export function findSimilarTerms(query: string, threshold = 0.6): FuzzySearchResult[] {
  const results: FuzzySearchResult[] = []
  const normalizedQuery = query.toLowerCase().trim()

  // Search through all species
  Object.entries(SPECIES_MAPPING).forEach(([id, species]) => {
    // Check scientific name
    const scientificScore = calculateSimilarity(normalizedQuery, species.scientificName.toLowerCase())
    if (scientificScore > threshold) {
      results.push({
        term: species.scientificName,
        score: scientificScore,
        type: "species",
        speciesId: id,
      })
    }

    // Check common names
    species.commonNames.forEach((name) => {
      const commonScore = calculateSimilarity(normalizedQuery, name.toLowerCase())
      if (commonScore > threshold) {
        results.push({
          term: name,
          score: commonScore,
          type: "common_name",
          speciesId: id,
        })
      }
    })

    // Check search terms
    species.searchTerms?.forEach((term) => {
      const termScore = calculateSimilarity(normalizedQuery, term.toLowerCase())
      if (termScore > threshold) {
        results.push({
          term,
          score: termScore,
          type: "search_term",
          speciesId: id,
        })
      }
    })
  })

  // Sort by score descending and remove duplicates
  return results
    .sort((a, b) => b.score - a.score)
    .filter(
      (result, index, self) =>
        index ===
        self.findIndex((r) => r.term.toLowerCase() === result.term.toLowerCase() && r.speciesId === result.speciesId),
    )
}

// Get the best match for a search term
export function getBestMatch(query: string): FuzzySearchResult | null {
  const matches = findSimilarTerms(query, 0.8)
  return matches.length > 0 ? matches[0] : null
}
