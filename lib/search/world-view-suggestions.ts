/**
 * World View Search Suggestions
 * Created: March 14, 2026
 *
 * Suggestions emphasize live events, trending searches, recent discoveries, and anomalies.
 * Covers real-time CREP data, popular queries, new findings, and notable events.
 */

export interface SuggestionItem {
  term: string
  /** Show on mobile (first N suggestions). Desktop shows more. */
  phoneVisible?: boolean
}

/** Suggestion terms by category: live, trending, recent, anomalies. */
export const WORLD_VIEW_SUGGESTIONS: Record<string, string[]> = {
  live_events: [
    "Flights over Pacific",
    "Ships in port now",
    "Satellite passes",
    "Live weather radar",
    "Planes over LA",
    "Vessels near coast",
    "ISS orbit now",
  ],
  trending: [
    "Bird migration 2025",
    "Pacific storm track",
    "California drought",
    "Psilocybin research",
    "Climate forecast",
    "Wildfire status",
    "Port activity",
  ],
  recent_discoveries: [
    "New fungal species",
    "Biodiversity hotspot",
    "Species near me",
    "Temperature anomaly",
    "Unusual migration",
    "New research papers",
  ],
  anomalies_events: [
    "Temperature anomaly",
    "Wildfire alert",
    "Storm surge",
    "Unusual migration",
    "Port congestion",
    "Hurricane track",
    "Dam status",
  ],
  popular_searches: [
    "Planes over LA",
    "Weather along shipping lane",
    "Ships in port",
    "Species near me",
    "Flights near me",
    "River levels",
  ],
}

/** Flattened pool of all suggestions. */
export const ALL_SUGGESTIONS: string[] = Object.values(WORLD_VIEW_SUGGESTIONS).flat()

/**
 * Get a random subset of suggestions for Try: buttons.
 * Ensures diversity by picking from multiple categories when possible.
 * @param count Total number to return (e.g. 6 for desktop)
 * @param mobileCount Number visible on mobile (first N)
 */
export function getRotatedSuggestions(count = 6, mobileCount = 3): SuggestionItem[] {
  const categories = Object.keys(WORLD_VIEW_SUGGESTIONS)
  const result: SuggestionItem[] = []
  const used = new Set<string>()

  // First pass: pick one from each category (up to count)
  for (let i = 0; i < count && result.length < count; i++) {
    const cat = categories[i % categories.length]
    const terms = WORLD_VIEW_SUGGESTIONS[cat] ?? []
    const available = terms.filter((t) => !used.has(t))
    if (available.length > 0) {
      const term = available[Math.floor(Math.random() * available.length)]
      used.add(term)
      result.push({
        term,
        phoneVisible: result.length < mobileCount,
      })
    }
  }

  // Second pass: fill remaining with random from any category
  const remaining = ALL_SUGGESTIONS.filter((t) => !used.has(t))
  while (result.length < count && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length)
    const term = remaining.splice(idx, 1)[0]
    if (term) {
      result.push({
        term,
        phoneVisible: result.length < mobileCount,
      })
    }
  }

  return result
}

/** Default Try: button suggestions for SSR/first paint (deterministic). */
export const DEFAULT_TRY_SUGGESTIONS: { term: string; phoneVisible?: boolean }[] = [
  { term: "Planes over LA", phoneVisible: true },
  { term: "Ships in port", phoneVisible: true },
  { term: "Temperature anomaly", phoneVisible: true },
  { term: "Bird migration 2025", phoneVisible: false },
  { term: "Wildfire alert", phoneVisible: false },
  { term: "Species near me", phoneVisible: false },
]

/**
 * Detect fungal search intent from a query.
 * When true, research/genetics/iNaturalist should apply fungi-only filters.
 * When false, use broad biodiversity (no fungi default).
 */
export function detectFungalSearchIntent(query: string): boolean {
  if (!query || query.length < 2) return false
  const q = query.toLowerCase().trim()
  const fungalTriggers = [
    "mushroom", "mushrooms", "fungus", "fungi", "fungal", "mycology", "mycelium",
    "reishi", "lingzhi", "lion's mane", "chaga", "maitake", "cordyceps", "shiitake",
    "oyster mushroom", "turkey tail", "enoki", "morel", "truffle", "chanterelle",
    "porcini", "psilocybin", "psilocin", "amanita", "ganoderma", "hericium",
    "trametes", "inonotus", "grifola", "lentinula", "pleurotus", "boletus",
    "cantharellus", "morchella", "tuber",
  ]
  return fungalTriggers.some((t) => q.includes(t) || q === t)
}

/**
 * Detect worldview intent from a search query.
 * Returns which widgets (crep, earth2, map) should be expanded based on query keywords.
 * Used for intent-based auto-expand so worldview widgets surface even before data arrives.
 */
export function detectWorldviewIntent(query: string): { crep: boolean; earth2: boolean; map: boolean } {
  if (!query || query.length < 2) return { crep: false, earth2: false, map: false }
  const q = query.toLowerCase()
  const crep =
    /\b(flights?|planes?|ships?|vessels?|satellites?|aircraft|aviation|maritime|orbit|iss|port|crep)\b/.test(q) ||
    /\b(planes?\s+over|flights?\s+over|ships?\s+in\s+port|vessels?\s+near)\b/.test(q)
  const earth2 =
    /\b(earth2|climate\s+forecast|weather\s+forecast|temperature\s+anomaly)\b/.test(q) ||
    /\b(weather|climate|forecast|storm|hurricane|drought)\b/.test(q)
  const map =
    /\b(map|location|where|near\s+me|river\s+levels?|dam|wildfire|flood)\b/.test(q) ||
    crep ||
    earth2
  return { crep, earth2, map }
}

/** Full-sentence suggestions for typing placeholder effect (world-view first). */
export const TYPING_PLACEHOLDER_SUGGESTIONS: string[] = [
  "Search species, weather, flights...",
  "Find flights, ships, satellites...",
  "Ask about weather, climate, storms...",
  "Explore species and biodiversity...",
  "Query Earth2 climate data...",
  "Check river levels, dams, wildfire...",
  "Search species, biodiversity, taxonomy...",
  "Discover research papers...",
  "Analyze chemical structures...",
  "What planes are over the Pacific?",
  "Species near me...",
  "Port activity, freeway congestion...",
  "Weather along shipping lane...",
]
