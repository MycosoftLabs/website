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

/** Suggestion terms by category: live, trending, recent, anomalies, infrastructure, species, environmental. */
export const WORLD_VIEW_SUGGESTIONS: Record<string, string[]> = {
  live_events: [
    "Flights over Pacific",
    "Ships in port now",
    "Satellite passes",
    "Planes over LA",
    "Vessels near coast",
    "ISS orbit now",
    "Active earthquakes",
    "Lightning strikes now",
  ],
  species_biodiversity: [
    "Bird migration 2026",
    "New fungal species",
    "Species near me",
    "Marine life Pacific",
    "Endangered mammals",
    "Coral reef status",
    "Insect populations",
    "Whale sightings",
  ],
  environmental: [
    "Wildfire alert",
    "Air quality index",
    "CO2 emissions",
    "Methane plumes",
    "River levels",
    "Dam status",
    "Water treatment plants",
    "Deforestation",
  ],
  weather_climate: [
    "Temperature anomaly",
    "Storm surge",
    "Hurricane track",
    "Climate forecast",
    "Solar flare activity",
    "Weather radar",
    "Pacific storm track",
    "Drought status",
  ],
  infrastructure: [
    "Power plants near me",
    "Cell tower locations",
    "Submarine cables",
    "Airport traffic",
    "Nuclear facilities",
    "Oil rigs",
    "Railway stations",
    "Wind farms",
  ],
  popular_searches: [
    "Planes over LA",
    "Weather along shipping lane",
    "Ships in port",
    "Species near me",
    "Flights near me",
    "Earthquake activity",
    "Satellite tracking",
    "Volcano alerts",
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
  { term: "Active earthquakes", phoneVisible: true },
  { term: "Bird migration 2026", phoneVisible: false },
  { term: "Air quality index", phoneVisible: false },
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
 * Now covers ALL Earth Intelligence domains.
 */
export function detectWorldviewIntent(query: string): { crep: boolean; earth2: boolean; map: boolean } {
  if (!query || query.length < 2) return { crep: false, earth2: false, map: false }
  const q = query.toLowerCase()
  const crep =
    /\b(flights?|planes?|ships?|vessels?|satellites?|aircraft|aviation|maritime|orbit|iss|port|crep)\b/.test(q) ||
    /\b(planes?\s+over|flights?\s+over|ships?\s+in\s+port|vessels?\s+near)\b/.test(q) ||
    /\b(earthquake|volcano|wildfire|lightning|tsunami|emission|methane|co2|air\s+quality)\b/.test(q) ||
    /\b(power\s+plant|factory|dam|mine|antenna|cell\s+tower|military|infrastructure)\b/.test(q) ||
    /\b(mycobrain|sensor|device)\b/.test(q) ||
    /\b(species|fungal|fungi|mushroom|observation|biodiversity|inaturalist|coral|marine\s+life)\b/.test(q) ||
    /\b(live\s+data|real[\s-]?time|tracking|monitor|radar)\b/.test(q)
  const earth2 =
    /\b(earth2|climate\s+forecast|weather\s+forecast|temperature\s+anomaly)\b/.test(q) ||
    /\b(weather|climate|forecast|storm|hurricane|drought|modis|landsat)\b/.test(q)
  const map =
    /\b(map|location|where|near\s+me|river\s+levels?|dam|wildfire|flood)\b/.test(q) ||
    /\b(airport|seaport|spaceport|railway|cable|antenna|buoy|webcam)\b/.test(q) ||
    crep ||
    earth2
  return { crep, earth2, map }
}

/** Full-sentence suggestions for typing placeholder effect (all-Earth intelligence). */
export const TYPING_PLACEHOLDER_SUGGESTIONS: string[] = [
  "Search all species, weather, flights, ships...",
  "Find earthquakes, volcanoes, storms...",
  "Track aircraft, vessels, satellites...",
  "Explore all biodiversity on Earth...",
  "Check air quality, CO2, methane emissions...",
  "Find power plants, dams, infrastructure...",
  "Query solar flares, space weather...",
  "Search marine life, coral reefs...",
  "What planes are over the Pacific?",
  "Bird migration patterns near me...",
  "Active wildfires and lightning...",
  "MycoBrain sensor readings...",
  "Cell towers and antenna locations...",
]
