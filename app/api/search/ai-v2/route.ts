/**
 * AI Search v2 - Robust Multi-Provider AI Engine
 * 
 * NEVER returns "No AI results" - always provides an answer from some source.
 * 
 * Fallback chain:
 * 1. MAS Brain API (primary - has memory context)
 * 2. OpenAI GPT-4o-mini
 * 3. Anthropic Claude 3 Haiku
 * 4. Groq Llama 3.1
 * 5. XAI Grok
 * 6. Local knowledge base fallback (always succeeds)
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// Provider configuration
const MAS_BRAIN_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const XAI_API_KEY = process.env.XAI_API_KEY

// Mycology system prompt
const MYCOLOGY_SYSTEM_PROMPT = `You are MYCA, Mycosoft's AI assistant specializing in mycology and fungi. You provide accurate, scientific information about mushrooms, fungi, mycelium, and related topics.

Key responsibilities:
- Answer questions about fungal species identification, taxonomy, and classification
- Explain the chemistry of fungal compounds (psilocybin, amatoxins, etc.)
- Discuss medicinal and culinary uses of mushrooms
- Provide safety information about poisonous species
- Share research findings from mycological studies
- Explain ecological roles of fungi

Always:
- Be scientifically accurate
- Include species names in italics format when possible
- Mention safety warnings for toxic species
- Cite general scientific consensus
- Acknowledge uncertainty when appropriate`

interface AIResult {
  answer: string
  source: string
  confidence: number
  model?: string
  latency?: number
}

interface SearchContext {
  previousSearches?: string[]
  focusedSpecies?: string[]
  topics?: string[]
}

// Provider 1: MAS Brain API (has memory context)
async function queryMASBrain(query: string, context?: SearchContext): Promise<AIResult | null> {
  try {
    const contextPrompt = context?.previousSearches?.length
      ? `\n\nUser's recent searches: ${context.previousSearches.slice(0, 5).join(", ")}`
      : ""

    const res = await fetch(`${MAS_BRAIN_URL}/voice/brain/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: query + contextPrompt,
        user_id: "search_user",
        include_memory: true,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const answer = data.response || data.message || data.content

    if (!answer || answer.length < 10) return null

    return {
      answer,
      source: "MYCA Brain",
      confidence: 0.95,
      model: "myca-brain",
    }
  } catch {
    return null
  }
}

// Provider 2: OpenAI
async function queryOpenAI(query: string): Promise<AIResult | null> {
  if (!OPENAI_API_KEY) return null

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: MYCOLOGY_SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const answer = data.choices?.[0]?.message?.content

    if (!answer) return null

    return {
      answer,
      source: "OpenAI",
      confidence: 0.9,
      model: "gpt-4o-mini",
    }
  } catch {
    return null
  }
}

// Provider 3: Anthropic Claude
async function queryAnthropic(query: string): Promise<AIResult | null> {
  if (!ANTHROPIC_API_KEY) return null

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1500,
        system: MYCOLOGY_SYSTEM_PROMPT,
        messages: [{ role: "user", content: query }],
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const answer = data.content?.[0]?.text

    if (!answer) return null

    return {
      answer,
      source: "Anthropic",
      confidence: 0.9,
      model: "claude-3-haiku",
    }
  } catch {
    return null
  }
}

// Provider 4: Groq
async function queryGroq(query: string): Promise<AIResult | null> {
  if (!GROQ_API_KEY) return null

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: MYCOLOGY_SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const answer = data.choices?.[0]?.message?.content

    if (!answer) return null

    return {
      answer,
      source: "Groq",
      confidence: 0.85,
      model: "llama-3.1-70b",
    }
  } catch {
    return null
  }
}

// Provider 5: XAI Grok
async function queryXAI(query: string): Promise<AIResult | null> {
  if (!XAI_API_KEY) return null

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          { role: "system", content: MYCOLOGY_SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const answer = data.choices?.[0]?.message?.content

    if (!answer) return null

    return {
      answer,
      source: "xAI",
      confidence: 0.85,
      model: "grok-beta",
    }
  } catch {
    return null
  }
}

// Provider 6: Local Knowledge Base Fallback (ALWAYS succeeds)
function getLocalKnowledgeFallback(query: string): AIResult {
  const lowerQuery = query.toLowerCase()

  // Knowledge base for common mycology topics
  const knowledgeBase: Record<string, string> = {
    poisonous: `The most dangerous poisonous mushrooms include species from the genus *Amanita*, particularly *Amanita phalloides* (Death Cap) and *Amanita virosa* (Destroying Angel). These contain amatoxins which cause severe liver damage. Other toxic genera include *Galerina* (contains amatoxins), *Gyromitra* (contains gyromitrin), and *Cortinarius* (contains orellanine affecting kidneys). Always have a positive identification from an expert before consuming any wild mushroom.`,

    psilocybin: `Psilocybin is a naturally occurring psychedelic compound found in over 200 species of mushrooms, primarily in the genus *Psilocybe*. The most well-known species include *Psilocybe cubensis*, *Psilocybe semilanceata* (Liberty Cap), and *Psilocybe azurescens*. Psilocybin is converted to psilocin in the body, which acts on serotonin receptors. Research is ongoing into therapeutic applications for depression, PTSD, and end-of-life anxiety. Legal status varies by jurisdiction.`,

    amanita: `*Amanita* is a genus containing some of the most beautiful and most deadly mushrooms. Notable species include: *A. muscaria* (Fly Agaric - red with white spots, psychoactive but toxic), *A. phalloides* (Death Cap - responsible for most mushroom fatalities), *A. caesarea* (Caesar's Mushroom - edible and prized), and *A. pantherina* (Panther Cap - toxic). Key identification features include a volva (cup at base), ring on stem, and free gills.`,

    "lion's mane": `*Hericium erinaceus* (Lion's Mane) is an edible and medicinal mushroom known for its white, cascading spines. It grows on hardwood trees and has gained attention for potential cognitive benefits. Research suggests compounds called hericenones and erinacines may stimulate nerve growth factor (NGF) production. It's cultivated commercially and used in supplements, though more human studies are needed to confirm therapeutic claims.`,

    chanterelle: `Chanterelles (*Cantharellus* species) are prized edible mushrooms found worldwide. The golden chanterelle (*C. cibarius*) is most common, with a fruity apricot-like aroma. Key features include false gills (ridges, not true gills), funnel shape, and yellow-orange color. They form mycorrhizal relationships with trees. Beware of look-alikes like *Omphalotus olearius* (Jack O'Lantern) which is toxic.`,

    cultivation: `Mushroom cultivation involves growing fungi on prepared substrates. Common methods include: PF Tek (brown rice flour and vermiculite for beginners), grain spawn (sterilized grain colonized with mycelium), bulk substrates (straw, wood chips, or manure), and log inoculation (for shiitake, lion's mane). Key factors are sterile technique, proper humidity (80-95%), temperature control, and fresh air exchange. Popular species for cultivation include oyster mushrooms, shiitake, and lion's mane.`,

    mycelium: `Mycelium is the vegetative body of fungi, consisting of a network of thread-like hyphae. It serves as the main organism while mushrooms are merely the fruiting bodies. Mycelium plays crucial ecological roles: decomposing organic matter, forming mycorrhizal relationships with plants (exchanging nutrients), and creating vast underground networks (the "Wood Wide Web"). Research explores mycelium for sustainable materials, bioremediation, and as a meat alternative.`,

    default: `Fungi are a diverse kingdom of organisms distinct from plants and animals. They include mushrooms, yeasts, molds, and more. Key features: they have cell walls containing chitin, reproduce via spores, and obtain nutrients through absorption. Ecologically, they're essential as decomposers, symbionts (mycorrhizae, lichens), and pathogens. The kingdom contains an estimated 2-5 million species, with only about 120,000 described. For specific information about a species or topic, try searching for the scientific name or specific compound.`,
  }

  // Find matching topic
  for (const [topic, answer] of Object.entries(knowledgeBase)) {
    if (topic !== "default" && lowerQuery.includes(topic)) {
      return {
        answer,
        source: "MYCA Knowledge Base",
        confidence: 0.7,
        model: "local-kb",
      }
    }
  }

  // Check for location-based queries
  if (lowerQuery.includes("san diego") || lowerQuery.includes("california")) {
    return {
      answer: `In Southern California and San Diego, several notable mushroom species can be found depending on season. Poisonous species include *Amanita phalloides* (Death Cap) which was introduced with European trees, *Amanita ocreata* (Western Destroying Angel), and various *Galerina* species on wood. During wet seasons, you may also encounter edible species like chanterelles and oyster mushrooms in appropriate habitats. Always consult local mycological societies (like the San Diego Mycological Society) for identification assistance and foraging guidance.`,
      source: "MYCA Knowledge Base",
      confidence: 0.75,
      model: "local-kb",
    }
  }

  // Default response
  return {
    answer: knowledgeBase.default,
    source: "MYCA Knowledge Base",
    confidence: 0.6,
    model: "local-kb",
  }
}

// Main handler
export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const query = request.nextUrl.searchParams.get("q")?.trim()

  if (!query) {
    return NextResponse.json({ error: "No query provided" }, { status: 400 })
  }

  // Parse context from request
  const contextParam = request.nextUrl.searchParams.get("context")
  let context: SearchContext | undefined
  if (contextParam) {
    try {
      context = JSON.parse(contextParam)
    } catch {
      // Ignore invalid context
    }
  }

  // Try providers in order
  const providers = [
    { name: "MAS Brain", fn: () => queryMASBrain(query, context) },
    { name: "OpenAI", fn: () => queryOpenAI(query) },
    { name: "Anthropic", fn: () => queryAnthropic(query) },
    { name: "Groq", fn: () => queryGroq(query) },
    { name: "xAI", fn: () => queryXAI(query) },
  ]

  let result: AIResult | null = null
  let attemptedProviders: string[] = []

  for (const provider of providers) {
    attemptedProviders.push(provider.name)
    const providerStart = performance.now()
    result = await provider.fn()

    if (result) {
      result.latency = Math.round(performance.now() - providerStart)
      break
    }
  }

  // Fallback to local knowledge base (ALWAYS succeeds)
  if (!result) {
    result = getLocalKnowledgeFallback(query)
    result.latency = 0
    attemptedProviders.push("Local KB")
  }

  const totalLatency = Math.round(performance.now() - startTime)

  return NextResponse.json({
    query,
    result: {
      answer: result.answer,
      confidence: result.confidence,
      source: result.source,
      model: result.model,
    },
    meta: {
      latency: totalLatency,
      providerLatency: result.latency,
      attemptedProviders,
    },
    timestamp: new Date().toISOString(),
  })
}

// Also support POST for larger context payloads
export async function POST(request: NextRequest) {
  const startTime = performance.now()

  let body: { query?: string; q?: string; context?: SearchContext }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const query = (body.query || body.q)?.trim()

  if (!query) {
    return NextResponse.json({ error: "No query provided" }, { status: 400 })
  }

  const context = body.context

  // Try providers in order
  const providers = [
    { name: "MAS Brain", fn: () => queryMASBrain(query, context) },
    { name: "OpenAI", fn: () => queryOpenAI(query) },
    { name: "Anthropic", fn: () => queryAnthropic(query) },
    { name: "Groq", fn: () => queryGroq(query) },
    { name: "xAI", fn: () => queryXAI(query) },
  ]

  let result: AIResult | null = null
  let attemptedProviders: string[] = []

  for (const provider of providers) {
    attemptedProviders.push(provider.name)
    const providerStart = performance.now()
    result = await provider.fn()

    if (result) {
      result.latency = Math.round(performance.now() - providerStart)
      break
    }
  }

  // Fallback to local knowledge base (ALWAYS succeeds)
  if (!result) {
    result = getLocalKnowledgeFallback(query)
    result.latency = 0
    attemptedProviders.push("Local KB")
  }

  const totalLatency = Math.round(performance.now() - startTime)

  return NextResponse.json({
    query,
    result: {
      answer: result.answer,
      confidence: result.confidence,
      source: result.source,
      model: result.model,
    },
    meta: {
      latency: totalLatency,
      providerLatency: result.latency,
      attemptedProviders,
    },
    timestamp: new Date().toISOString(),
  })
}
