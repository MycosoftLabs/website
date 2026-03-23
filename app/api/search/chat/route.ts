/**
 * Search Chat API - Feb 2026
 *
 * Proxies to MAS voice orchestrator; search-style enrichment via MAS /api/search/execute when enabled (Mar 14, 2026).
 */

import { NextRequest, NextResponse } from "next/server"
import { searchLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limiter"
import { evaluateGovernance } from "@/lib/services/avani-governance"
import { callMASSearchExecute, mapMASResponseToUnified } from "@/lib/search/mas-search-proxy"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"
const USE_MAS_SEARCH = process.env.USE_MAS_SEARCH !== "false"

interface ChatRequest {
  message: string
  conversation_id?: string
  session_id?: string
  user_id?: string
  context?: Record<string, unknown>
}

interface DataCard {
  type: "species" | "chemistry" | "genetics" | "location" | "taxonomy" | "images" | "research" | "news"
  data: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIP(request)
  const rl = searchLimiter.check(ip)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!, rl.reason)

  try {
    const body = (await request.json()) as ChatRequest

    if (!body.message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // AVANI governance: all MYCA ingress routes must pass
    const avani = await evaluateGovernance({
      message: body.message,
      user_id: body.user_id || ip || "anonymous",
      user_role: "user",
      is_superuser: false,
      action_type: "chat",
      context: body.context,
    })
    if (avani.verdict === "deny") {
      return NextResponse.json(
        {
          success: false,
          error: "Governance denied",
          reason: avani.reasoning,
          audit_trail_id: avani.audit_trail_id,
        },
        { status: 403 }
      )
    }

    // First, detect entities in the message for data enrichment
    const detectedEntities = await detectEntities(body.message)

    // Fetch enrichment data from MINDEX in parallel
    const enrichmentPromises: Promise<DataCard | null>[] = []

    for (const entity of detectedEntities) {
      switch (entity.type) {
        case "species":
          enrichmentPromises.push(fetchSpeciesCard(entity.value))
          break
        case "compound":
          enrichmentPromises.push(fetchCompoundCard(entity.value))
          break
        case "genetics":
          enrichmentPromises.push(fetchGeneticsCard(entity.value))
          break
        case "location":
          enrichmentPromises.push(fetchLocationCard(entity.value))
          break
      }
    }

    // Search-style enrichment: MAS-first (Mar 14, 2026), else MINDEX
    if (looksLikeSearchQuery(body.message)) {
      if (USE_MAS_SEARCH) {
        enrichmentPromises.push(...await searchViaMAS(body.message))
      } else {
        enrichmentPromises.push(...await searchMINDEX(body.message))
      }
    }

    // Collect enrichment cards
    const enrichmentResults = await Promise.allSettled(enrichmentPromises)
    const dataCards: DataCard[] = enrichmentResults
      .filter((r): r is PromiseFulfilledResult<DataCard | null> => r.status === "fulfilled" && r.value !== null)
      .map(r => r.value!)

    // Call local orchestrator route (NOT MAS VM directly — let Next.js handle fallbacks)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3010}`
    let masData: Record<string, unknown> | null = null

    try {
      const masResponse = await fetch(`${baseUrl}/api/mas/voice/orchestrator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: body.message,
          conversation_id: body.conversation_id,
          session_id: body.session_id,
          want_audio: false,
          actor: "user",
          source: "web",
          context: {
            ...(body.context || {}),
            user_id: body.user_id || "anonymous",
            platform: "mobile-search",
            enriched_entities: detectedEntities,
          },
        }),
        signal: AbortSignal.timeout(20000),
      })

      if (masResponse.ok) {
        masData = await masResponse.json()
      }
    } catch {
      // Orchestrator unreachable, try Groq fallback below
    }

    // Groq fallback if orchestrator failed
    if (!masData?.response_text) {
      const GROQ_API_KEY = process.env.GROQ_API_KEY
      if (GROQ_API_KEY) {
        try {
          const enrichContext = dataCards.length > 0
            ? `\n\n[Search context - found ${dataCards.length} data cards: ${dataCards.map(c => `${c.type}: ${JSON.stringify(c.data).slice(0, 200)}`).join("; ")}]`
            : ""
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              max_tokens: 1500,
              messages: [
                { role: "system", content: `You are MYCA, Mycosoft's AI assistant. Answer the user's question about mycology, biology, or general topics. Be thorough and scientifically accurate. You ARE MYCA — never say you're another AI. CRITICAL: NEVER tell the user to visit external websites, apps, or services. You ARE the service — provide answers directly using your own data systems (MINDEX, CREP, NatureOS). Never say "check out [website]" or "try [app]" — instead, provide the data or say you are pulling it up.` },
                { role: "user", content: body.message + enrichContext },
              ],
            }),
            signal: AbortSignal.timeout(12000),
          })
          if (groqRes.ok) {
            const groqData = await groqRes.json()
            masData = { response_text: groqData.choices?.[0]?.message?.content || "" }
          }
        } catch {
          // Groq also failed
        }
      }
    }

    // Ollama/Llama fallback if Groq also failed
    if (!masData?.response_text) {
      const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
      const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.3"
      try {
        const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
          signal: AbortSignal.timeout(2000),
        }).catch(() => null)
        if (healthCheck?.ok) {
          const enrichContext = dataCards.length > 0
            ? `\n\n[Search context - found ${dataCards.length} data cards: ${dataCards.map(c => `${c.type}: ${JSON.stringify(c.data).slice(0, 200)}`).join("; ")}]`
            : ""
          const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: OLLAMA_MODEL,
              messages: [
                { role: "system", content: `You are MYCA, Mycosoft's AI assistant. Answer the user's question about mycology, biology, or general topics. Be thorough and scientifically accurate. You ARE MYCA — never say you're another AI. CRITICAL: NEVER tell the user to visit external websites, apps, or services. You ARE the service — provide answers directly using your own data systems (MINDEX, CREP, NatureOS). Never say "check out [website]" or "try [app]" — instead, provide the data or say you are pulling it up.` },
                { role: "user", content: body.message + enrichContext },
              ],
              stream: false,
              options: { num_predict: 1500, temperature: 0.7 },
            }),
            signal: AbortSignal.timeout(30000),
          })
          if (ollamaRes.ok) {
            const ollamaData = await ollamaRes.json()
            const content = ollamaData.message?.content
            if (content && content.length > 10) {
              masData = { response_text: content }
            }
          }
        }
      } catch {
        // Ollama also failed
      }
    }

    // Final fallback
    if (!masData?.response_text) {
      masData = {
        response_text: dataCards.length > 0
          ? `I found some results for "${body.message}". Here's what I discovered from the MINDEX database:`
          : `I'm MYCA, Mycosoft's AI assistant. I'm reconnecting to my intelligence services. Please try your question again in a moment.`,
      }
    }

    // Combine response with enrichment data
    return NextResponse.json({
      response_text: masData.response_text,
      data_cards: [
        ...((masData.nlq_data as unknown[] || []) as Array<{ id: string; type: string; title: string; subtitle?: string }>).map(nlqToDataCard).filter(Boolean),
        ...dataCards,
      ],
      suggestions: extractSuggestions(masData.response_text as string),
      conversation_id: (masData.conversation_id as string) || body.conversation_id,
      agent: (masData.agent as string) || "myca",
      requires_confirmation: masData.requires_confirmation,
      nlq_actions: masData.nlq_actions,
      nlq_sources: masData.nlq_sources,
    })

  } catch (error) {
    console.error("Search chat error:", error)
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    )
  }
}

// Entity detection using simple patterns
interface DetectedEntity {
  type: "species" | "compound" | "genetics" | "location"
  value: string
  confidence: number
}

async function detectEntities(message: string): Promise<DetectedEntity[]> {
  const entities: DetectedEntity[] = []
  const lowerMessage = message.toLowerCase()

  // Species patterns - scientific names (italic: Genus species)
  const speciesPattern = /\b([A-Z][a-z]+\s+[a-z]+(?:\s+var\.\s+[a-z]+)?)\b/g
  const speciesMatches = message.matchAll(speciesPattern)
  for (const match of speciesMatches) {
    entities.push({ type: "species", value: match[1], confidence: 0.9 })
  }

  // Common fungi names
  const fungiKeywords = [
    "amanita", "psilocybe", "agaricus", "boletus", "cantharellus",
    "morchella", "tricholoma", "pleurotus", "ganoderma", "cordyceps",
    "shiitake", "portobello", "chanterelle", "morel", "truffle"
  ]
  for (const keyword of fungiKeywords) {
    if (lowerMessage.includes(keyword)) {
      entities.push({ type: "species", value: keyword, confidence: 0.8 })
    }
  }

  // Compound patterns
  const compoundKeywords = [
    "psilocybin", "psilocin", "muscimol", "ibotenic", "ergothioneine",
    "beta-glucan", "lentinan", "hericenone", "erinacine"
  ]
  for (const keyword of compoundKeywords) {
    if (lowerMessage.includes(keyword)) {
      entities.push({ type: "compound", value: keyword, confidence: 0.9 })
    }
  }

  // Genetics patterns (accession numbers)
  const accessionPattern = /\b([A-Z]{2}\d{6,})\b/g
  const accessionMatches = message.matchAll(accessionPattern)
  for (const match of accessionMatches) {
    entities.push({ type: "genetics", value: match[1], confidence: 0.95 })
  }

  // Location patterns
  if (lowerMessage.includes("near me") || lowerMessage.includes("in my area")) {
    entities.push({ type: "location", value: "user_location", confidence: 0.7 })
  }

  // Deduplicate
  const seen = new Set<string>()
  return entities.filter(e => {
    const key = `${e.type}:${e.value.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function fetchSpeciesCard(name: string): Promise<DataCard | null> {
  try {
    const response = await fetch(
      `${MINDEX_API_URL}/api/taxa/search?q=${encodeURIComponent(name)}&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!response.ok) return null
    const data = await response.json()
    if (!data.results?.length) return null
    
    const species = data.results[0]
    return {
      type: "species",
      data: {
        id: species.id || species.taxon_id,
        name: species.scientific_name || species.name,
        commonName: species.common_name || species.vernacular_name,
        imageUrl: species.image_url || species.photo_url,
        observationCount: species.observation_count,
        habitat: species.habitat,
        edibility: species.edibility,
        taxonomy: species.taxonomy,
      },
    }
  } catch {
    return null
  }
}

async function fetchCompoundCard(name: string): Promise<DataCard | null> {
  try {
    const response = await fetch(
      `${MINDEX_API_URL}/api/compounds/search?q=${encodeURIComponent(name)}&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!response.ok) return null
    const data = await response.json()
    if (!data.results?.length) return null
    
    const compound = data.results[0]
    return {
      type: "chemistry",
      data: {
        id: compound.id || compound.pubchem_cid,
        name: compound.name,
        molecularFormula: compound.molecular_formula,
        molecularWeight: compound.molecular_weight,
        smiles: compound.smiles,
        bioactivity: compound.bioactivity,
        toxicity: compound.toxicity,
        fungalSources: compound.fungal_sources,
      },
    }
  } catch {
    return null
  }
}

async function fetchGeneticsCard(accession: string): Promise<DataCard | null> {
  try {
    const response = await fetch(
      `${MINDEX_API_URL}/api/genetics/sequence/${encodeURIComponent(accession)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!response.ok) return null
    const data = await response.json()
    
    return {
      type: "genetics",
      data: {
        id: data.id,
        name: data.organism || data.definition,
        accessionNumber: data.accession,
        sequenceType: data.marker || data.gene,
        sequence: data.sequence?.slice(0, 200),
        sequenceLength: data.sequence_length || data.sequence?.length,
        source: data.source || "NCBI GenBank",
      },
    }
  } catch {
    return null
  }
}

async function fetchLocationCard(value: string): Promise<DataCard | null> {
  // For "user_location", we'd need to get actual location from the client
  // For now, return null - the client will handle geolocation
  return null
}

/** Enrichment via MAS search orchestrator (Mar 14, 2026). Returns DataCard promises. */
async function searchViaMAS(query: string): Promise<Promise<DataCard | null>[]> {
  const promises: Promise<DataCard | null>[] = []
  try {
    const mas = await callMASSearchExecute({ query, limit: 10 }, AbortSignal.timeout(8000))
    if (!mas) return promises
    const { results } = mapMASResponseToUnified(mas)
    for (const s of (results.species || []).slice(0, 2)) {
      promises.push(Promise.resolve({
        type: "species",
        data: {
          id: s.id ?? s.uuid,
          name: s.scientific_name ?? s.scientificName ?? s.name,
          commonName: s.common_name ?? s.commonName,
          imageUrl: s.image_url ?? s.imageUrl,
        },
      }))
    }
    for (const c of (results.compounds || []).slice(0, 2)) {
      promises.push(Promise.resolve({
        type: "chemistry",
        data: {
          id: c.id ?? c.uuid,
          name: c.name ?? c.compound_name,
          molecularFormula: c.formula ?? c.molecular_formula,
        },
      }))
    }
    for (const r of (results.research || []).slice(0, 1)) {
      promises.push(Promise.resolve({
        type: "research",
        data: {
          id: r.id ?? r.doi,
          title: r.title,
          authors: r.authors,
          doi: r.doi,
        },
      }))
    }
  } catch {
    // Silently fail
  }
  return promises
}

async function searchMINDEX(query: string): Promise<Promise<DataCard | null>[]> {
  const promises: Promise<DataCard | null>[] = []
  
  // Quick unified search
  try {
    const response = await fetch(
      `${MINDEX_API_URL}/api/search?q=${encodeURIComponent(query)}&limit=3`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (response.ok) {
      const data = await response.json()
      
      // Convert search results to data cards
      if (data.taxa?.length) {
        for (const taxon of data.taxa.slice(0, 2)) {
          promises.push(Promise.resolve({
            type: "species",
            data: {
              id: taxon.id,
              name: taxon.scientific_name,
              commonName: taxon.common_name,
              imageUrl: taxon.image_url,
            },
          }))
        }
      }
      
      if (data.compounds?.length) {
        for (const compound of data.compounds.slice(0, 2)) {
          promises.push(Promise.resolve({
            type: "chemistry",
            data: {
              id: compound.id,
              name: compound.name,
              molecularFormula: compound.molecular_formula,
            },
          }))
        }
      }
      
      if (data.sequences?.length) {
        for (const seq of data.sequences.slice(0, 1)) {
          promises.push(Promise.resolve({
            type: "genetics",
            data: {
              id: seq.id,
              name: seq.organism,
              accessionNumber: seq.accession,
              sequenceType: seq.marker,
            },
          }))
        }
      }
    }
  } catch {
    // Silently fail enrichment
  }
  
  return promises
}

function looksLikeSearchQuery(message: string): boolean {
  const searchPatterns = [
    /show me/i,
    /find/i,
    /search for/i,
    /look up/i,
    /what is/i,
    /tell me about/i,
    /information on/i,
  ]
  return searchPatterns.some(p => p.test(message))
}

function nlqToDataCard(nlqItem: { id: string; type: string; title: string; subtitle?: string }): DataCard | null {
  const typeMap: Record<string, DataCard["type"]> = {
    species: "species",
    compound: "chemistry",
    genetics: "genetics",
    location: "location",
    research: "research",
    news: "news",
    paper: "research",
  }
  
  const type = typeMap[nlqItem.type.toLowerCase()]
  if (!type) return null
  
  return {
    type,
    data: {
      id: nlqItem.id,
      name: nlqItem.title,
      subtitle: nlqItem.subtitle,
    },
  }
}

function extractSuggestions(responseText: string): string[] {
  const suggestions: string[] = []
  
  const suggestionPatterns = [
    /you (?:might|could|can) (?:also )?(?:ask|try|search)[:\s]+(.+?)(?:\n|$)/gi,
    /related (?:questions|searches)[:\s]+(.+?)(?:\n|$)/gi,
    /try asking[:\s]+(.+?)(?:\n|$)/gi,
  ]
  
  for (const pattern of suggestionPatterns) {
    const matches = responseText.matchAll(pattern)
    for (const match of matches) {
      const items = match[1].split(/[,\n•\-]/).map(s => s.trim()).filter(Boolean)
      suggestions.push(...items.slice(0, 3))
    }
  }
  
  return suggestions.slice(0, 4)
}
