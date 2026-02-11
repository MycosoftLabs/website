/**
 * Data Grafting Client
 * 
 * Utility functions to graft external data into MINDEX during search.
 * When search discovers new data (from iNaturalist, LLM insights, etc.),
 * it gets stored in MINDEX for faster future retrieval.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface GraftItem {
  source: "inaturalist" | "openalex" | "wikipedia" | "llm" | "gbif" | "chemspider" | "user"
  dataType: "taxon" | "observation" | "compound" | "research" | "image"
  data: Record<string, unknown>
  confidence: number
}

export interface GraftResult {
  success: boolean
  grafted: boolean
  recordId?: string
  message: string
  dedupeMatch?: string
}

export interface BatchGraftResult {
  success: boolean
  totalItems: number
  graftedCount: number
  results: GraftResult[]
}

// =============================================================================
// GRAFTING FUNCTIONS
// =============================================================================

/**
 * Graft a single data item to MINDEX
 */
export async function graftToMindex(item: GraftItem): Promise<GraftResult> {
  try {
    const res = await fetch("/api/mindex/graft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })

    return await res.json()
  } catch (error) {
    return {
      success: false,
      grafted: false,
      message: `Graft failed: ${error}`,
    }
  }
}

/**
 * Batch graft multiple items to MINDEX
 */
export async function batchGraftToMindex(items: GraftItem[]): Promise<BatchGraftResult> {
  try {
    const res = await fetch("/api/mindex/graft", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })

    return await res.json()
  } catch (error) {
    return {
      success: false,
      totalItems: items.length,
      graftedCount: 0,
      results: [],
    }
  }
}

// =============================================================================
// SPECIALIZED GRAFTERS
// =============================================================================

/**
 * Graft iNaturalist observations to MINDEX
 */
export async function graftINaturalistObservations(observations: Array<{
  id: number
  species_guess?: string
  taxon?: { name: string; preferred_common_name?: string }
  location?: string
  place_guess?: string
  geojson?: { coordinates: [number, number] }
  observed_on?: string
  photos?: Array<{ url?: string }>
  user?: { login: string }
  quality_grade?: string
}>): Promise<BatchGraftResult> {
  const items: GraftItem[] = observations.map(obs => ({
    source: "inaturalist" as const,
    dataType: "observation" as const,
    confidence: obs.quality_grade === "research" ? 0.9 : 0.6,
    data: {
      external_id: `inat-${obs.id}`,
      taxon_name: obs.taxon?.name || obs.species_guess,
      common_name: obs.taxon?.preferred_common_name,
      latitude: obs.geojson?.coordinates?.[1],
      longitude: obs.geojson?.coordinates?.[0],
      location: obs.place_guess || obs.location,
      observed_at: obs.observed_on,
      photo_url: obs.photos?.[0]?.url?.replace("square", "medium"),
      observer: obs.user?.login,
      quality_grade: obs.quality_grade,
    },
  }))

  return batchGraftToMindex(items)
}

/**
 * Graft LLM-extracted insights to MINDEX
 */
export async function graftLLMInsights(insights: Array<{
  type: "taxon" | "compound" | "research"
  data: Record<string, unknown>
  extractedFrom: string
}>): Promise<BatchGraftResult> {
  const items: GraftItem[] = insights.map(insight => ({
    source: "llm" as const,
    dataType: insight.type,
    confidence: 0.5, // LLM insights get medium confidence
    data: {
      ...insight.data,
      llm_source: insight.extractedFrom,
    },
  }))

  return batchGraftToMindex(items)
}

/**
 * Graft Wikipedia-derived taxon data
 */
export async function graftWikipediaTaxa(taxa: Array<{
  title: string
  scientificName?: string
  description?: string
  wikiUrl: string
}>): Promise<BatchGraftResult> {
  const items: GraftItem[] = taxa.map(taxon => ({
    source: "wikipedia" as const,
    dataType: "taxon" as const,
    confidence: 0.7,
    data: {
      canonical_name: taxon.scientificName || taxon.title,
      common_name: taxon.title,
      description: taxon.description,
      wikipedia_url: taxon.wikiUrl,
    },
  }))

  return batchGraftToMindex(items)
}

/**
 * Graft research papers from OpenAlex
 */
export async function graftOpenAlexPapers(papers: Array<{
  id: string
  title: string
  authorships?: Array<{ author: { display_name: string } }>
  primary_location?: { source?: { display_name: string } }
  publication_year?: number
  doi?: string
  abstract_inverted_index?: Record<string, number[]>
}>): Promise<BatchGraftResult> {
  const items: GraftItem[] = papers.map(paper => ({
    source: "openalex" as const,
    dataType: "research" as const,
    confidence: 0.85,
    data: {
      title: paper.title,
      authors: paper.authorships?.map(a => a.author.display_name).join(", "),
      journal: paper.primary_location?.source?.display_name,
      year: paper.publication_year,
      doi: paper.doi,
      // Reconstruct abstract from inverted index
      abstract: paper.abstract_inverted_index 
        ? reconstructAbstract(paper.abstract_inverted_index) 
        : undefined,
      openalex_id: paper.id,
    },
  }))

  return batchGraftToMindex(items)
}

/**
 * Reconstruct abstract from OpenAlex inverted index format
 */
function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const words: Array<[string, number]> = []
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos])
    }
  }
  words.sort((a, b) => a[1] - b[1])
  return words.map(([word]) => word).join(" ")
}

/**
 * Graft GBIF occurrence data
 */
export async function graftGBIFOccurrences(occurrences: Array<{
  key: number
  scientificName?: string
  decimalLatitude?: number
  decimalLongitude?: number
  eventDate?: string
  locality?: string
  country?: string
  media?: Array<{ identifier: string }>
}>): Promise<BatchGraftResult> {
  const items: GraftItem[] = occurrences.map(occ => ({
    source: "gbif" as const,
    dataType: "observation" as const,
    confidence: 0.75,
    data: {
      external_id: `gbif-${occ.key}`,
      taxon_name: occ.scientificName,
      latitude: occ.decimalLatitude,
      longitude: occ.decimalLongitude,
      observed_at: occ.eventDate,
      location: occ.locality ? `${occ.locality}, ${occ.country}` : occ.country,
      photo_url: occ.media?.[0]?.identifier,
    },
  }))

  return batchGraftToMindex(items)
}

// =============================================================================
// AUTO-GRAFT INTEGRATION
// =============================================================================

/**
 * Queue for background grafting (non-blocking)
 */
const graftQueue: GraftItem[] = []
let isProcessing = false

/**
 * Add items to background graft queue
 * Grafting happens asynchronously without blocking search
 */
export function queueForGraft(items: GraftItem[]): void {
  graftQueue.push(...items)
  processGraftQueue()
}

async function processGraftQueue(): Promise<void> {
  if (isProcessing || graftQueue.length === 0) return

  isProcessing = true

  try {
    // Process in batches of 10
    while (graftQueue.length > 0) {
      const batch = graftQueue.splice(0, 10)
      await batchGraftToMindex(batch)
      
      // Small delay between batches to not overwhelm the API
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  } finally {
    isProcessing = false
  }
}

/**
 * Get queue status
 */
export function getGraftQueueStatus(): { queueLength: number; isProcessing: boolean } {
  return { queueLength: graftQueue.length, isProcessing }
}
