/**
 * Research Papers Search API Route - Feb 2026
 * 
 * Searches for academic papers about fungi using OpenAlex (free, no API key).
 * Real-data only: OpenAlex API results.
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface ResearchPaper {
  id: string
  title: string
  authors: string[]
  journal: string
  year: number
  citationCount: number
  abstract: string
  doi: string | null
  url: string
  source: string
}

async function searchOpenAlex(query: string, limit: number): Promise<ResearchPaper[]> {
  try {
    // OpenAlex is free and doesn't require an API key
    // Add fungi-related terms to enhance relevance
    const searchQuery = `${query} fungi mushroom`
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(searchQuery)}&per_page=${limit}&sort=cited_by_count:desc&filter=type:journal-article`,
      { 
        signal: AbortSignal.timeout(8000),
        headers: {
          'Accept': 'application/json',
          // Polite pool - identify ourselves for better rate limits
          'User-Agent': 'Mycosoft (https://mycosoft.com; mailto:dev@mycosoft.org)'
        }
      }
    )
    
    if (!res.ok) {
      console.error(`OpenAlex API error: ${res.status} ${res.statusText}`)
      return []
    }
    
    const data = await res.json()
    
    return (data.results || []).map((work: any) => ({
      id: work.id?.replace('https://openalex.org/', '') || `openalex-${Date.now()}`,
      title: work.title || "Untitled",
      authors: (work.authorships || [])
        .slice(0, 5)
        .map((a: any) => a.author?.display_name || "Unknown")
        .filter(Boolean),
      journal: work.primary_location?.source?.display_name || 
               work.host_venue?.display_name || 
               "Unknown Journal",
      year: work.publication_year || 0,
      citationCount: work.cited_by_count || 0,
      abstract: work.abstract_inverted_index 
        ? reconstructAbstract(work.abstract_inverted_index)
        : (work.abstract || ""),
      doi: work.doi || null,
      url: work.doi || work.id || "",
      source: "OpenAlex",
    }))
  } catch (error) {
    console.error("OpenAlex search error:", error)
    return []
  }
}

// OpenAlex returns abstracts as inverted index - reconstruct them
function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  if (!invertedIndex || typeof invertedIndex !== 'object') return ""
  
  try {
    const words: [string, number][] = []
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        words.push([word, pos])
      }
    }
    words.sort((a, b) => a[1] - b[1])
    return words.map(w => w[0]).join(' ').slice(0, 500) + (words.length > 100 ? '...' : '')
  } catch {
    return ""
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "fungi"
  const limitParam = request.nextUrl.searchParams.get("limit")
  const limit = Math.min(parseInt(limitParam || "10"), 25)
  
  const results = await searchOpenAlex(query, limit)
  
  return NextResponse.json({
    query,
    results,
    total: results.length,
    source: "OpenAlex",
    timestamp: new Date().toISOString(),
  })
}
