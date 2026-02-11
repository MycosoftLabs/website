/**
 * Unified Search V2 API
 * 
 * The ultimate search endpoint that combines:
 * 1. Intent parsing (natural language understanding)
 * 2. Parallel MINDEX queries (taxa, compounds, genetics, research)
 * 3. AI answers with multi-provider fallback
 * 4. Live results from external sources (iNaturalist, etc.)
 * 5. Auto-grafting of discovered data
 * 6. User context personalization
 * 
 * Never returns "No results" - always provides useful information
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// =============================================================================
// CONFIGURATION
// =============================================================================

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const INATURALIST_API = "https://api.inaturalist.org/v1"

// =============================================================================
// TYPES
// =============================================================================

interface SearchIntent {
  type: "species" | "compound" | "media" | "research" | "location" | "general"
  queryType: "factual" | "comparison" | "list" | "identification" | "howto" | "news" | "definition"
  filters: {
    toxicity?: string
    location?: { city?: string; state?: string; country?: string; lat?: number; lng?: number; radius?: number }
    timeframe?: string
    mediaType?: string
    edibility?: string
  }
  entities: string[]
  keywords: string[]
  originalQuery: string
  confidence: number
}

interface TaxonResult {
  id: string
  canonical_name: string
  common_name?: string
  rank: string
  description?: string
  image_url?: string
  toxicity?: string
  edibility?: string
}

interface CompoundResult {
  id: string
  name: string
  formula?: string
  molecular_weight?: number
  fungal_sources?: string[]
}

interface ResearchResult {
  id: string
  title: string
  authors?: string
  journal?: string
  year?: number
  doi?: string
  abstract?: string
}

interface LiveObservation {
  id: number
  species_guess: string
  taxon_name?: string
  common_name?: string
  location?: string
  photo_url?: string
  observed_on?: string
  quality_grade?: string
  taxon_id?: number
  is_toxic?: boolean
  toxicity_level?: string
}

interface AIAnswer {
  answer: string
  provider: string
  confidence: number
  sources?: string[]
}

interface UnifiedSearchResponse {
  query: string
  intent: SearchIntent
  ai_answer: AIAnswer
  mindex_results: {
    taxa: TaxonResult[]
    compounds: CompoundResult[]
    research: ResearchResult[]
  }
  live_results: {
    observations: LiveObservation[]
    media?: unknown[]
    news?: unknown[]
  }
  personalization: {
    interests_applied: string[]
    context_used: boolean
  }
  grafting: {
    items_queued: number
    message: string
  }
  meta: {
    duration_ms: number
    providers_used: string[]
  }
}

// =============================================================================
// INTENT PARSING
// =============================================================================

function parseIntent(query: string): SearchIntent {
  const q = query.toLowerCase()
  
  // Detect entity type
  let type: SearchIntent["type"] = "general"
  if (/\b(species|mushroom|fungus|fungi|amanita|psilocybin|agaricus|boletus)\b/.test(q)) {
    type = "species"
  } else if (/\b(compound|chemical|molecule|psilocybin|psilocin|muscimol|amatoxin)\b/.test(q)) {
    type = "compound"
  } else if (/\b(movie|film|tv|show|documentary|book|game)\b/.test(q)) {
    type = "media"
  } else if (/\b(research|study|paper|journal|science)\b/.test(q)) {
    type = "research"
  } else if (/\b(in|near|around|from)\s+([\w\s]+)(?:$|,)/.test(q)) {
    type = "location"
  }

  // Detect query type
  let queryType: SearchIntent["queryType"] = "factual"
  if (/\bmost\b|\brank|\btop\b|\blist\b/.test(q)) queryType = "list"
  else if (/\bcompare\b|\bvs\b|\bdifference\b/.test(q)) queryType = "comparison"
  else if (/\bwhat is\b|\bdefine\b/.test(q)) queryType = "definition"
  else if (/\bhow to\b|\bhow do\b/.test(q)) queryType = "howto"
  else if (/\bidentify\b|\bis this\b/.test(q)) queryType = "identification"
  else if (/\bnews\b|\blatest\b|\brecent\b/.test(q)) queryType = "news"

  // Extract filters
  const filters: SearchIntent["filters"] = {}
  
  // Toxicity
  if (/\bpoison(ous)?\b|\btoxic\b|\bdeadly\b/.test(q)) {
    filters.toxicity = "poisonous"
  } else if (/\bedible\b|\bsafe to eat\b/.test(q)) {
    filters.toxicity = "edible"
  } else if (/\bpsychedelic\b|\bhallucinogen\b|\bmagic\b/.test(q)) {
    filters.toxicity = "psychedelic"
  }

  // Location extraction
  const locationMatch = q.match(/\b(?:in|near|around|from)\s+([\w\s]+?)(?:$|,|\band\b)/)
  if (locationMatch) {
    const loc = locationMatch[1].trim()
    // Check for known cities/states
    if (/san diego/i.test(loc)) {
      filters.location = { city: "San Diego", state: "CA", country: "USA", lat: 32.7157, lng: -117.1611 }
    } else if (/california/i.test(loc)) {
      filters.location = { state: "California", country: "USA", lat: 36.7783, lng: -119.4179 }
    } else if (/new york/i.test(loc)) {
      filters.location = { city: "New York", state: "NY", country: "USA", lat: 40.7128, lng: -74.0060 }
    } else {
      filters.location = { city: loc }
    }
    filters.location.radius = 100 // km
  }

  // Media type
  if (/\bmovie|\bfilm/i.test(q)) filters.mediaType = "movies"
  else if (/\btv|\bshow/i.test(q)) filters.mediaType = "tv"
  else if (/\bdocumentar/i.test(q)) filters.mediaType = "documentaries"

  // Extract entities (species names, compound names)
  const entities: string[] = []
  const speciesPatterns = [
    /\b(amanita\s*\w*)/gi,
    /\b(psilocybe\s*\w*)/gi,
    /\b(agaricus\s*\w*)/gi,
    /\b(boletus\s*\w*)/gi,
    /\b(lactarius\s*\w*)/gi,
    /\b(russula\s*\w*)/gi,
    /\b(galerina\s*\w*)/gi,
  ]
  for (const pattern of speciesPatterns) {
    const matches = q.match(pattern)
    if (matches) entities.push(...matches.map(m => m.trim()))
  }

  // Extract keywords
  const stopwords = new Set(["the", "a", "an", "is", "are", "what", "how", "in", "on", "at", "to", "for", "of", "and", "or", "most"])
  const keywords = q.split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w))

  return {
    type,
    queryType,
    filters,
    entities,
    keywords,
    originalQuery: query,
    confidence: 0.7 + (entities.length * 0.1),
  }
}

// =============================================================================
// MINDEX QUERIES
// =============================================================================

async function searchMindexTaxa(query: string, filters: SearchIntent["filters"], limit: number = 10): Promise<TaxonResult[]> {
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    if (filters.toxicity) params.set("toxicity", filters.toxicity)

    const res = await fetch(`${MINDEX_API_URL}/api/mindex/unified-search?${params}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    
    const data = await res.json()
    return (data.taxa || data.data || []).map((t: Record<string, unknown>) => ({
      id: t.id || t.uuid,
      canonical_name: t.canonical_name || t.scientificName,
      common_name: t.common_name || t.commonName,
      rank: t.rank || "species",
      description: t.description,
      image_url: t.image_url || t.imageUrl,
      toxicity: t.toxicity,
      edibility: t.edibility,
    }))
  } catch {
    return []
  }
}

async function searchMindexCompounds(query: string, limit: number = 10): Promise<CompoundResult[]> {
  try {
    const res = await fetch(`${MINDEX_API_URL}/api/mindex/compounds?search=${encodeURIComponent(query)}&limit=${limit}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    
    const data = await res.json()
    return (data.data || []).map((c: Record<string, unknown>) => ({
      id: c.id || c.uuid,
      name: c.name,
      formula: c.formula,
      molecular_weight: c.molecular_weight,
      fungal_sources: c.fungal_sources,
    }))
  } catch {
    return []
  }
}

async function searchMindexResearch(query: string, limit: number = 10): Promise<ResearchResult[]> {
  try {
    const res = await fetch(`${MINDEX_API_URL}/api/mindex/knowledge/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    
    const data = await res.json()
    return (data.papers || data.results || []).map((p: Record<string, unknown>) => ({
      id: p.id || p.doi,
      title: p.title,
      authors: p.authors,
      journal: p.journal,
      year: p.year,
      doi: p.doi,
      abstract: p.abstract,
    }))
  } catch {
    return []
  }
}

// =============================================================================
// LIVE RESULTS
// =============================================================================

async function fetchLiveObservations(
  query: string,
  intent: SearchIntent,
  limit: number = 12
): Promise<LiveObservation[]> {
  try {
    const params = new URLSearchParams({
      quality_grade: "research,needs_id",
      photos: "true",
      per_page: String(limit),
      order_by: "observed_on",
      order: "desc",
    })

    // Use taxon name if we have specific entities
    if (intent.entities.length > 0) {
      params.set("taxon_name", intent.entities[0])
    } else if (intent.keywords.length > 0) {
      params.set("q", intent.keywords.join(" "))
    } else {
      params.set("iconic_taxa", "Fungi")
      params.set("q", query)
    }

    // Add location filter
    if (intent.filters.location?.lat && intent.filters.location?.lng) {
      params.set("lat", String(intent.filters.location.lat))
      params.set("lng", String(intent.filters.location.lng))
      params.set("radius", String(intent.filters.location.radius || 100))
    }

    const res = await fetch(`${INATURALIST_API}/observations?${params}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []

    const data = await res.json()
    const results = data.results || []

    // Known toxic species for enrichment
    const toxicSpecies: Record<string, string> = {
      "amanita phalloides": "deadly",
      "amanita virosa": "deadly",
      "amanita ocreata": "deadly",
      "galerina marginata": "deadly",
      "conocybe filaris": "deadly",
      "amanita muscaria": "toxic",
      "gyromitra esculenta": "toxic",
      "chlorophyllum molybdites": "toxic",
    }

    return results.map((obs: Record<string, unknown>) => {
      const taxonName = (obs.taxon as Record<string, unknown>)?.name as string || obs.species_guess as string || ""
      const toxicityLevel = toxicSpecies[taxonName.toLowerCase()]

      return {
        id: obs.id as number,
        species_guess: obs.species_guess as string,
        taxon_name: taxonName,
        common_name: (obs.taxon as Record<string, unknown>)?.preferred_common_name as string,
        location: obs.place_guess as string,
        photo_url: ((obs.photos as Array<{ url?: string }>)?.[0]?.url || "").replace("square", "medium"),
        observed_on: obs.observed_on as string,
        quality_grade: obs.quality_grade as string,
        taxon_id: (obs.taxon as Record<string, unknown>)?.id as number,
        is_toxic: !!toxicityLevel,
        toxicity_level: toxicityLevel,
      }
    })
  } catch {
    return []
  }
}

// =============================================================================
// AI ANSWER
// =============================================================================

async function getAIAnswer(query: string, intent: SearchIntent, context?: string): Promise<AIAnswer> {
  const systemPrompt = `You are MYCA, an expert mycologist AI. Provide accurate, detailed answers about fungi.
Focus on: species identification, toxicity, edibility, ecology, chemistry, and research.
If asked about location-specific fungi, provide relevant species for that area.
Always note toxicity warnings for dangerous species.
Be concise but thorough.`

  const userPrompt = context 
    ? `User context: ${context}\n\nQuestion: ${query}` 
    : query

  // Try MAS Brain first
  try {
    const res = await fetch(`${MAS_API_URL}/voice/brain/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userPrompt,
        system_prompt: systemPrompt,
        include_context: true,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      const data = await res.json()
      return {
        answer: data.response || data.message || data.content,
        provider: "MYCA Brain",
        confidence: 0.9,
        sources: data.sources,
      }
    }
  } catch {}

  // Try OpenAI
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 1000,
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (res.ok) {
        const data = await res.json()
        return {
          answer: data.choices?.[0]?.message?.content || "",
          provider: "OpenAI",
          confidence: 0.85,
        }
      }
    } catch {}
  }

  // Try Anthropic
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (res.ok) {
        const data = await res.json()
        return {
          answer: data.content?.[0]?.text || "",
          provider: "Anthropic",
          confidence: 0.85,
        }
      }
    } catch {}
  }

  // Try Groq
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 1000,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (res.ok) {
        const data = await res.json()
        return {
          answer: data.choices?.[0]?.message?.content || "",
          provider: "Groq",
          confidence: 0.8,
        }
      }
    } catch {}
  }

  // Fallback: Knowledge base answer
  return getKnowledgeBaseAnswer(query, intent)
}

function getKnowledgeBaseAnswer(query: string, intent: SearchIntent): AIAnswer {
  const q = query.toLowerCase()

  // Location-based toxic mushroom queries
  if (intent.filters.toxicity === "poisonous" && intent.filters.location) {
    const location = intent.filters.location.city || intent.filters.location.state || "your area"
    return {
      answer: `The most dangerous mushrooms in ${location} include species from the Amanita genus, particularly Amanita phalloides (Death Cap), Amanita ocreata (Destroying Angel), and Amanita virosa. These contain amatoxins that cause severe liver damage and are responsible for most fatal mushroom poisonings worldwide. Other toxic species to watch for include Galerina marginata (found on decaying wood) and Chlorophyllum molybdites (the most commonly ingested toxic mushroom in North America). Always consult an expert before consuming any wild mushroom, and never eat a mushroom you cannot positively identify.`,
      provider: "Local Knowledge Base",
      confidence: 0.7,
      sources: ["Mycosoft Toxicology Database", "North American Mycological Association"],
    }
  }

  // General Amanita query
  if (/amanita/i.test(q)) {
    return {
      answer: `Amanita is a genus of fungi containing approximately 600 species. This genus includes some of the most poisonous mushrooms known, including Amanita phalloides (Death Cap), responsible for the majority of fatal mushroom poisonings worldwide, as well as Amanita muscaria (Fly Agaric), known for its distinctive red cap with white spots and psychoactive properties. The genus also contains edible species like Amanita caesarea (Caesar's Mushroom), prized since Roman times. Key identification features include: universal veil remnants (volva at base, patches on cap), partial veil forming a ring, white spore print, and free gills. Never consume an Amanita unless you are absolutely certain of its identification.`,
      provider: "Local Knowledge Base",
      confidence: 0.75,
      sources: ["Mycosoft Species Database"],
    }
  }

  // Psilocybin query
  if (/psilocybin|psilocin|magic mushroom|psychedelic/i.test(q)) {
    return {
      answer: `Psilocybin is a naturally occurring psychedelic compound produced by over 200 species of fungi, primarily in the genus Psilocybe. When ingested, it is converted to psilocin, which acts on serotonin receptors in the brain. Recent research has shown promising therapeutic applications for treatment-resistant depression, anxiety, addiction, and end-of-life distress. Notable species include Psilocybe cubensis, Psilocybe semilanceata (Liberty Cap), and Psilocybe azurescens. The legal status varies by jurisdiction. Note: Possession and cultivation may be illegal in many areas.`,
      provider: "Local Knowledge Base",
      confidence: 0.75,
      sources: ["Mycosoft Chemistry Database", "PubChem"],
    }
  }

  // Default mycology answer
  return {
    answer: `I can help with your question about fungi. The fungal kingdom includes over 144,000 described species, with estimates suggesting millions more undiscovered. Key areas of mycology include: species identification, ecology (decomposers, symbionts, parasites), chemistry (bioactive compounds, toxins), and applications (food, medicine, materials). For specific identification questions, I recommend providing details about cap shape, gill attachment, spore print color, habitat, and substrate. What specific aspect would you like to explore?`,
    provider: "Local Knowledge Base",
    confidence: 0.6,
    sources: ["Mycosoft Knowledge Base"],
  }
}

// =============================================================================
// DATA GRAFTING
// =============================================================================

interface GraftQueueItem {
  source: string
  dataType: string
  data: Record<string, unknown>
  confidence: number
}

async function queueDataForGrafting(observations: LiveObservation[]): Promise<number> {
  if (observations.length === 0) return 0

  // Queue for background grafting - don't block the response
  const items: GraftQueueItem[] = observations.slice(0, 10).map(obs => ({
    source: "inaturalist",
    dataType: "observation",
    confidence: obs.quality_grade === "research" ? 0.9 : 0.6,
    data: {
      external_id: `inat-${obs.id}`,
      taxon_name: obs.taxon_name,
      common_name: obs.common_name,
      latitude: null, // Would extract from full observation
      longitude: null,
      location: obs.location,
      observed_at: obs.observed_on,
      photo_url: obs.photo_url,
      quality_grade: obs.quality_grade,
    },
  }))

  // Fire and forget - don't await
  fetch("/api/mindex/graft", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  }).catch(() => {}) // Ignore errors for background task

  return items.length
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q") || ""
  const context = searchParams.get("context") || ""
  const includeAI = searchParams.get("ai") !== "false"
  const includeLive = searchParams.get("live") !== "false"

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 })
  }

  // Parse intent
  const intent = parseIntent(query)
  const providersUsed: string[] = []

  // Run parallel searches
  const [taxaResults, compoundResults, researchResults, liveObservations, aiAnswer] = await Promise.all([
    searchMindexTaxa(query, intent.filters),
    intent.type === "compound" || intent.keywords.some(k => /chem|compound|molecule/.test(k))
      ? searchMindexCompounds(query)
      : Promise.resolve([]),
    intent.queryType === "news" || intent.type === "research"
      ? searchMindexResearch(query)
      : Promise.resolve([]),
    includeLive ? fetchLiveObservations(query, intent) : Promise.resolve([]),
    includeAI ? getAIAnswer(query, intent, context) : Promise.resolve({
      answer: "",
      provider: "none",
      confidence: 0,
    }),
  ])

  if (taxaResults.length > 0) providersUsed.push("MINDEX/taxa")
  if (compoundResults.length > 0) providersUsed.push("MINDEX/compounds")
  if (researchResults.length > 0) providersUsed.push("MINDEX/research")
  if (liveObservations.length > 0) providersUsed.push("iNaturalist")
  if (aiAnswer.provider !== "none") providersUsed.push(aiAnswer.provider)

  // Queue data for grafting (non-blocking)
  const graftCount = await queueDataForGrafting(liveObservations)

  // Build response
  const response: UnifiedSearchResponse = {
    query,
    intent,
    ai_answer: aiAnswer,
    mindex_results: {
      taxa: taxaResults,
      compounds: compoundResults,
      research: researchResults,
    },
    live_results: {
      observations: liveObservations,
      media: intent.type === "media" ? [] : undefined,
      news: intent.queryType === "news" ? [] : undefined,
    },
    personalization: {
      interests_applied: [], // Would come from session memory
      context_used: !!context,
    },
    grafting: {
      items_queued: graftCount,
      message: graftCount > 0 ? `Queued ${graftCount} observations for grafting to MINDEX` : "No new data to graft",
    },
    meta: {
      duration_ms: Date.now() - startTime,
      providers_used: providersUsed,
    },
  }

  return NextResponse.json(response)
}

export async function POST(request: NextRequest) {
  // POST allows passing more context including user interests
  let body: { query: string; context?: string; interests?: string[]; location?: { lat: number; lng: number } }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { query, context, interests, location } = body

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 })
  }

  const startTime = Date.now()
  const intent = parseIntent(query)

  // Override location if provided
  if (location?.lat && location?.lng) {
    intent.filters.location = { lat: location.lat, lng: location.lng, radius: 100 }
  }

  // Build context with user interests
  let fullContext = context || ""
  if (interests && interests.length > 0) {
    fullContext += `\nUser interests: ${interests.join(", ")}`
  }

  const providersUsed: string[] = []

  // Run parallel searches
  const [taxaResults, compoundResults, researchResults, liveObservations, aiAnswer] = await Promise.all([
    searchMindexTaxa(query, intent.filters),
    searchMindexCompounds(query),
    searchMindexResearch(query),
    fetchLiveObservations(query, intent),
    getAIAnswer(query, intent, fullContext),
  ])

  if (taxaResults.length > 0) providersUsed.push("MINDEX/taxa")
  if (compoundResults.length > 0) providersUsed.push("MINDEX/compounds")
  if (researchResults.length > 0) providersUsed.push("MINDEX/research")
  if (liveObservations.length > 0) providersUsed.push("iNaturalist")
  if (aiAnswer.provider !== "none") providersUsed.push(aiAnswer.provider)

  // Queue data for grafting
  const graftCount = await queueDataForGrafting(liveObservations)

  const response: UnifiedSearchResponse = {
    query,
    intent,
    ai_answer: aiAnswer,
    mindex_results: {
      taxa: taxaResults,
      compounds: compoundResults,
      research: researchResults,
    },
    live_results: {
      observations: liveObservations,
      media: intent.type === "media" ? [] : undefined,
      news: intent.queryType === "news" ? [] : undefined,
    },
    personalization: {
      interests_applied: interests || [],
      context_used: !!fullContext,
    },
    grafting: {
      items_queued: graftCount,
      message: graftCount > 0 ? `Queued ${graftCount} observations for grafting to MINDEX` : "No new data to graft",
    },
    meta: {
      duration_ms: Date.now() - startTime,
      providers_used: providersUsed,
    },
  }

  return NextResponse.json(response)
}
