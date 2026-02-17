/**
 * Search Trends API
 * 
 * Returns trending search topics from MINDEX and aggregated user searches.
 * Used by useSearchTrends hook and internal apps.
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

interface TrendingTopic {
  topic: string
  count: number
  category: "species" | "compound" | "location" | "research" | "general"
  change: "up" | "down" | "stable"
}

// Default fallback trends when MINDEX is unavailable
const FALLBACK_TRENDS: TrendingTopic[] = [
  { topic: "Amanita phalloides", count: 1247, category: "species", change: "up" },
  { topic: "Psilocybin", count: 983, category: "compound", change: "up" },
  { topic: "Edible mushrooms California", count: 756, category: "location", change: "stable" },
  { topic: "Lion's Mane cognitive", count: 621, category: "research", change: "up" },
  { topic: "Mycorrhizal networks", count: 543, category: "general", change: "stable" },
  { topic: "Cordyceps militaris", count: 487, category: "species", change: "down" },
  { topic: "Bioluminescent fungi", count: 412, category: "general", change: "up" },
  { topic: "Morel hunting season", count: 398, category: "location", change: "up" },
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get("limit") || "10", 10)
  const category = searchParams.get("category")

  try {
    // Try to fetch from MINDEX search analytics
    const mindexRes = await fetch(
      `${MINDEX_API_URL}/api/mindex/analytics/search-trends?limit=${limit}`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (mindexRes.ok) {
      const data = await mindexRes.json()
      let trends: TrendingTopic[] = (data.trends || []).map((t: Record<string, unknown>) => ({
        topic: t.topic || t.query || t.term,
        count: t.count || t.searches || 0,
        category: categorize(t.topic as string || t.query as string || ""),
        change: t.change || "stable",
      }))

      // Filter by category if specified
      if (category) {
        trends = trends.filter((t) => t.category === category)
      }

      return NextResponse.json({
        trends: trends.slice(0, limit),
        source: "mindex",
        timestamp: new Date().toISOString(),
      })
    }
  } catch (e) {
    console.warn("[Trends API] MINDEX fetch failed:", e)
  }

  // Fallback to static trends
  let trends = FALLBACK_TRENDS
  if (category) {
    trends = trends.filter((t) => t.category === category)
  }

  return NextResponse.json({
    trends: trends.slice(0, limit),
    source: "fallback",
    timestamp: new Date().toISOString(),
  })
}

// Categorize a search term
function categorize(term: string): TrendingTopic["category"] {
  const t = term.toLowerCase()
  
  // Species patterns
  if (/\b(amanita|psilocybe|boletus|russula|lactarius|cortinarius|agaricus|cantharellus|morchella|tuber)\b/.test(t)) {
    return "species"
  }
  
  // Compound patterns
  if (/\b(psilocybin|psilocin|muscimol|amatoxin|ergot|compound|molecule|chemical)\b/.test(t)) {
    return "compound"
  }
  
  // Location patterns
  if (/\b(in|near|around|california|oregon|washington|pacific|midwest|europe|asia)\b/.test(t)) {
    return "location"
  }
  
  // Research patterns
  if (/\b(study|research|trial|cognitive|therapeutic|medicinal|science|paper)\b/.test(t)) {
    return "research"
  }
  
  return "general"
}
