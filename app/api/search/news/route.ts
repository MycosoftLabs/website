/**
 * News Search API Route - Feb 2026
 * 
 * Returns recent news articles about fungi, mushrooms, and mycology.
 * Real-data only: NewsAPI results, no curated/mock fallback.
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const NEWS_API_KEY = process.env.NEWS_API_KEY

interface NewsResult {
  id: string
  title: string
  source: string
  publishedAt: string
  url: string
  summary: string
  imageUrl: string | null
  category: "science" | "health" | "environment" | "business" | "general"
}

async function searchNewsAPI(query: string, limit: number): Promise<NewsResult[]> {
  if (!NEWS_API_KEY) return []
  
  try {
    const searchQuery = `${query} fungi OR mushroom OR mycology`
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&sortBy=publishedAt&language=en&pageSize=${limit}&apiKey=${NEWS_API_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    )
    
    if (!res.ok) return []
    
    const data = await res.json()
    return (data.articles || []).map((article: any, i: number) => ({
      id: `newsapi-${i}-${Date.now()}`,
      title: article.title || "",
      source: article.source?.name || "Unknown",
      publishedAt: article.publishedAt || new Date().toISOString(),
      url: article.url || "",
      summary: article.description || article.content?.slice(0, 200) || "",
      imageUrl: article.urlToImage || null,
      category: categorizeArticle(article.title, article.description),
    }))
  } catch {
    return []
  }
}

function categorizeArticle(title: string, description: string): NewsResult["category"] {
  const text = `${title} ${description}`.toLowerCase()
  
  if (text.includes("study") || text.includes("research") || text.includes("scientist") || text.includes("discover")) {
    return "science"
  }
  if (text.includes("therapy") || text.includes("treatment") || text.includes("health") || text.includes("medical")) {
    return "health"
  }
  if (text.includes("environment") || text.includes("climate") || text.includes("sustainable") || text.includes("eco")) {
    return "environment"
  }
  if (text.includes("market") || text.includes("business") || text.includes("company") || text.includes("industry")) {
    return "business"
  }
  return "general"
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "fungi"
  const limitParam = request.nextUrl.searchParams.get("limit")
  const limit = Math.min(parseInt(limitParam || "10"), 20)
  
  const results = await searchNewsAPI(query, limit)
  
  return NextResponse.json({
    query,
    results,
    total: results.length,
    source: "NewsAPI",
    message: NEWS_API_KEY ? undefined : "NEWS_API_KEY not configured",
    timestamp: new Date().toISOString(),
  })
}
