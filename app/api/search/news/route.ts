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

async function searchNewsAPI(query: string, limit: number): Promise<{ results: NewsResult[], error?: string }> {
  if (!NEWS_API_KEY) {
    return { results: [], error: "NEWS_API_KEY not configured" }
  }
  
  try {
    // Use the query directly for NewsAPI
    const searchQuery = query
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&sortBy=publishedAt&language=en&pageSize=${limit}&apiKey=${NEWS_API_KEY}`
    
    console.log('[News API] Searching:', searchQuery)
    
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(10000),
      headers: {
        'Accept': 'application/json',
      }
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('[News API] Error:', res.status, errorText)
      return { results: [], error: `NewsAPI error: ${res.status} - ${errorText.slice(0, 100)}` }
    }
    
    const data = await res.json()
    console.log('[News API] Articles found:', data.articles?.length || 0)
    
    if (data.status === 'error') {
      return { results: [], error: `NewsAPI: ${data.message}` }
    }
    
    const results = (data.articles || []).map((article: any, i: number) => ({
      id: `newsapi-${i}-${Date.now()}`,
      title: article.title || "",
      source: article.source?.name || "Unknown",
      publishedAt: article.publishedAt || new Date().toISOString(),
      url: article.url || "",
      summary: article.description || article.content?.slice(0, 200) || "",
      imageUrl: article.urlToImage || null,
      category: categorizeArticle(article.title, article.description),
    }))
    
    return { results }
  } catch (err: any) {
    console.error('[News API] Fetch error:', err.message)
    return { results: [], error: `Fetch failed: ${err.message}` }
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
  
  const { results, error } = await searchNewsAPI(query, limit)
  
  return NextResponse.json({
    query,
    results,
    total: results.length,
    source: "NewsAPI",
    error: error,
    timestamp: new Date().toISOString(),
  })
}
