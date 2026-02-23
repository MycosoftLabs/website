/**
 * Search Chat API - Feb 2026
 * 
 * Streaming endpoint for MYCA-powered search conversations.
 * Handles entity detection, MINDEX enrichment, and data card generation.
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

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
  try {
    const body = (await request.json()) as ChatRequest

    if (!body.message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
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

    // Also run a quick search if the message looks like a search query
    if (looksLikeSearchQuery(body.message)) {
      enrichmentPromises.push(
        ...await searchMINDEX(body.message)
      )
    }

    // Collect enrichment cards
    const enrichmentResults = await Promise.allSettled(enrichmentPromises)
    const dataCards: DataCard[] = enrichmentResults
      .filter((r): r is PromiseFulfilledResult<DataCard | null> => r.status === "fulfilled" && r.value !== null)
      .map(r => r.value!)

    // Call MAS Brain/Orchestrator for the AI response
    const masResponse = await fetch(`${MAS_API_URL}/api/mas/voice/orchestrator`, {
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
    })

    if (!masResponse.ok) {
      const errorText = await masResponse.text()
      console.error("MAS API error:", errorText)
      
      // Return a fallback response with any data cards we found
      return NextResponse.json({
        response_text: dataCards.length > 0
          ? `I found some results for your query. Here's what I discovered:`
          : `I'm having trouble processing your request right now. Please try again in a moment.`,
        data_cards: dataCards,
        conversation_id: body.conversation_id,
        error: "MAS API unavailable",
      })
    }

    const masData = await masResponse.json()

    // Combine MAS response with enrichment data
    return NextResponse.json({
      response_text: masData.response_text,
      data_cards: [
        ...(masData.nlq_data || []).map(nlqToDataCard).filter(Boolean),
        ...dataCards,
      ],
      suggestions: extractSuggestions(masData.response_text),
      conversation_id: masData.conversation_id,
      agent: masData.agent,
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
