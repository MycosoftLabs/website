/**
 * Search AI Route - MYCA-Integrated
 *
 * NEVER returns "No AI results" - always provides an answer.
 *
 * Fallback chain:
 * 1. MYCA Consciousness (Intent Engine, persistent memory, full awareness)
 * 2. MAS Brain API (memory-integrated LLM)
 * 3. OpenAI / Anthropic (when MAS unreachable)
 * 4. Local mycology knowledge base (always succeeds)
 *
 * Feb 11, 2026
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const MYCOLOGY_SYSTEM_CONTEXT = `You are MYCA, Mycosoft's AI. You specialize in mycology and fungi. 
Provide accurate scientific information about mushrooms, fungi, mycelium, compounds, and related topics.
Be concise, cite species in italics when possible, and acknowledge uncertainty when appropriate.`

interface SearchContext {
  species?: string[]
  compounds?: string[]
  previousSearches?: string[]
}

// 1. MYCA Consciousness - Intent Engine, memory, full awareness
async function queryMYCAConsciousness(
  query: string,
  context?: SearchContext
): Promise<{ answer: string; source: string; confidence: number } | null> {
  try {
    const contextStr = context?.species?.length
      ? ` [User is viewing: ${context.species.slice(0, 5).join(", ")}]`
      : context?.compounds?.length
        ? ` [User is viewing compounds: ${context.compounds.slice(0, 5).join(", ")}]`
        : ""

    const res = await fetch(`${MAS_API_URL}/api/myca/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: query + contextStr,
        session_id: "search-ai-session",
        user_id: "search_user",
        context: { source: "search", search_context: context },
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const answer = data.message || data.response || data.content

    if (!answer || typeof answer !== "string" || answer.length < 10) return null

    return {
      answer: answer.trim(),
      source: "MYCA Consciousness",
      confidence: 0.95,
    }
  } catch {
    return null
  }
}

// 2. MAS Brain - Memory-integrated LLM
async function queryMASBrain(
  query: string,
  context?: SearchContext
): Promise<{ answer: string; source: string; confidence: number } | null> {
  try {
    const contextPrompt = context?.species?.length
      ? `\n\n[User's current search context - species: ${context.species.slice(0, 5).join(", ")}]`
      : ""

    const res = await fetch(`${MAS_API_URL}/voice/brain/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: query + contextPrompt,
        user_id: "search_user",
        session_id: "search-ai-session",
        include_memory_context: true,
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const answer = data.response || data.message || data.content

    if (!answer || typeof answer !== "string" || answer.length < 10) return null

    return {
      answer: answer.trim(),
      source: "MYCA Brain",
      confidence: 0.9,
    }
  } catch {
    return null
  }
}

// 3. OpenAI
async function queryOpenAI(query: string) {
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
          { role: "system", content: MYCOLOGY_SYSTEM_CONTEXT },
          { role: "user", content: query },
        ],
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const answer = data.choices?.[0]?.message?.content
    if (!answer) return null
    return { answer, source: "OpenAI", confidence: 0.9 }
  } catch {
    return null
  }
}

// 4. Anthropic
async function queryAnthropic(query: string) {
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
        max_tokens: 1000,
        system: MYCOLOGY_SYSTEM_CONTEXT,
        messages: [{ role: "user", content: query }],
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const answer = data.content?.[0]?.text
    if (!answer) return null
    return { answer, source: "Anthropic", confidence: 0.9 }
  } catch {
    return null
  }
}

// 5. Local knowledge base - ALWAYS succeeds (never "No AI results")
function getLocalKnowledgeFallback(
  query: string
): { answer: string; source: string; confidence: number } {
  const lowerQuery = query.toLowerCase()

  const knowledgeBase: Record<string, string> = {
    poisonous: `The most dangerous poisonous mushrooms include species from the genus *Amanita*, particularly *Amanita phalloides* (Death Cap) and *Amanita virosa* (Destroying Angel). These contain amatoxins which cause severe liver damage. Other toxic genera include *Galerina*, *Gyromitra*, and *Cortinarius*. Always have a positive identification from an expert before consuming any wild mushroom.`,
    psilocybin: `Psilocybin is a naturally occurring psychedelic compound found in over 200 species of mushrooms, primarily in the genus *Psilocybe*. Notable species include *Psilocybe cubensis*, *Psilocybe semilanceata* (Liberty Cap), and *Psilocybe azurescens*. Psilocybin converts to psilocin in the body. Research is ongoing into therapeutic applications. Legal status varies by jurisdiction.`,
    amanita: `*Amanita* is a genus containing some of the most beautiful and most deadly mushrooms. Notable species: *A. muscaria* (Fly Agaric), *A. phalloides* (Death Cap), *A. caesarea* (Caesar's Mushroom - edible). Key features include a volva (cup at base), ring on stem, and free gills.`,
    "lion's mane": `*Hericium erinaceus* (Lion's Mane) is an edible and medicinal mushroom with white, cascading spines. It grows on hardwood trees. Research suggests compounds may stimulate nerve growth factor (NGF) production.`,
    chanterelle: `Chanterelles (*Cantharellus* species) are prized edible mushrooms. The golden chanterelle (*C. cibarius*) has false gills, funnel shape, and apricot-like aroma. Beware of *Omphalotus olearius* (Jack O'Lantern) which is toxic.`,
    cultivation: `Mushroom cultivation methods include: PF Tek (beginners), grain spawn, bulk substrates (straw, wood chips), and log inoculation. Key factors: sterile technique, humidity 80-95%, temperature control, and fresh air exchange.`,
    mycelium: `Mycelium is the vegetative body of fungi - a network of hyphae. It decomposes matter, forms mycorrhizal relationships with plants, and creates underground networks ("Wood Wide Web"). Research explores mycelium for sustainable materials and bioremediation.`,
    reishi: `*Ganoderma lucidum* (Reishi) is a medicinal polypore. Compounds like ganoderic acids may support immune function. It grows on hardwood and is cultivated for supplements.`,
    default: `Fungi are a diverse kingdom including mushrooms, yeasts, and molds. They have cell walls with chitin, reproduce via spores, and obtain nutrients through absorption. Ecologically they're essential as decomposers and symbionts. For specific species or compounds, try searching the MINDEX database.`,
  }

  for (const [topic, answer] of Object.entries(knowledgeBase)) {
    if (topic !== "default" && lowerQuery.includes(topic)) {
      return { answer, source: "MYCA Knowledge Base", confidence: 0.75 }
    }
  }

  if (lowerQuery.includes("san diego") || lowerQuery.includes("california")) {
    return {
      answer: `In Southern California, notable species include *Amanita phalloides* (Death Cap), *Amanita ocreata* (Western Destroying Angel), and various *Galerina* species. Consult the San Diego Mycological Society for identification and foraging guidance.`,
      source: "MYCA Knowledge Base",
      confidence: 0.75,
    }
  }

  return {
    answer: knowledgeBase.default,
    source: "MYCA Knowledge Base",
    confidence: 0.65,
  }
}

// Fire-and-forget: record intention for MYCA (Intent Engine)
function recordIntention(query: string, source: string, sessionId: string) {
  fetch(`${MAS_API_URL}/api/myca/intention`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      event_type: "search",
      data: { query, ai_source: source },
      context: { source: "search_ai" },
    }),
  }).catch(() => {})
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim()
  if (!query) return NextResponse.json({ error: "No query provided" }, { status: 400 })

  let context: SearchContext | undefined
  const contextParam = request.nextUrl.searchParams.get("context")
  if (contextParam) {
    try {
      context = JSON.parse(contextParam) as SearchContext
    } catch {
      // ignore invalid context
    }
  }

  const providers = [
    () => queryMYCAConsciousness(query, context),
    () => queryMASBrain(query, context),
    () => queryOpenAI(query),
    () => queryAnthropic(query),
  ]

  let result: { answer: string; source: string; confidence: number } | null = null

  for (const fn of providers) {
    result = await fn()
    if (result) break
  }

  if (!result) {
    result = getLocalKnowledgeFallback(query)
  } else if (
    result.source === "MYCA Consciousness" ||
    result.source === "MYCA Brain"
  ) {
    recordIntention(query, result.source, "search-ai-session")
  }

  return NextResponse.json({
    query,
    result: {
      answer: result.answer,
      source: result.source,
      confidence: result.confidence,
    },
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  let body: { q?: string; query?: string; context?: SearchContext }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const query = (body.q || body.query)?.trim()
  if (!query) return NextResponse.json({ error: "No query provided" }, { status: 400 })

  const context = body.context

  const providers = [
    () => queryMYCAConsciousness(query, context),
    () => queryMASBrain(query, context),
    () => queryOpenAI(query),
    () => queryAnthropic(query),
  ]

  let result: { answer: string; source: string; confidence: number } | null = null

  for (const fn of providers) {
    result = await fn()
    if (result) break
  }

  if (!result) result = getLocalKnowledgeFallback(query)
  else if (
    result.source === "MYCA Consciousness" ||
    result.source === "MYCA Brain"
  ) {
    recordIntention(query, result.source, "search-ai-session")
  }

  return NextResponse.json({
    query,
    result: {
      answer: result.answer,
      source: result.source,
      confidence: result.confidence,
    },
    timestamp: new Date().toISOString(),
  })
}
