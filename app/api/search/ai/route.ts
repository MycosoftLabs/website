import { NextRequest, NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

async function searchWithOpenAI(query: string) {
  if (!OPENAI_API_KEY) return null
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are MYCA, Mycosoft's AI assistant specializing in mycology and fungi. Provide accurate scientific information about mushrooms, fungi, mycelium, and related topics." },
          { role: "user", content: query }
        ],
        max_tokens: 1000
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { answer: data.choices?.[0]?.message?.content || "", source: "openai", confidence: 0.9 }
  } catch { return null }
}

async function searchWithAnthropic(query: string) {
  if (!ANTHROPIC_API_KEY) return null
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        system: "You are MYCA, Mycosoft's AI assistant specializing in mycology and fungi.",
        messages: [{ role: "user", content: query }]
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { answer: data.content?.[0]?.text || "", source: "anthropic", confidence: 0.9 }
  } catch { return null }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")
  if (!query?.trim()) return NextResponse.json({ error: "No query provided" }, { status: 400 })
  
  const result = await searchWithOpenAI(query) || await searchWithAnthropic(query) || { 
    answer: `No AI results for "${query}". Try searching the MINDEX species database or browse compounds.`, 
    source: "fallback", 
    confidence: 0.5 
  }
  
  return NextResponse.json({ query, result, timestamp: new Date().toISOString() })
}
